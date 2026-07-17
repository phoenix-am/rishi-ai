import { Injectable } from "@nestjs/common";
import { AsyncLocalStorage } from "async_hooks";
import { randomUUID } from "crypto";

/**
 * Custom exception thrown when invalid transaction lifecycle operations are attempted.
 */
export class TransactionException extends Error {
  constructor(message: string) {
    super(`[Transaction Error] ${message}`);
    this.name = "TransactionException";
  }
}

/**
 * Represents the state of a transaction lifecycle.
 */
export type TransactionState = "active" | "committed" | "rolled_back";

/**
 * Represents an active transaction context.
 */
export interface TransactionContext<TClient = any> {
  /**
   * Unique identifier of the transaction context.
   */
  readonly id: string;

  /**
   * Unique identifier of the parent transaction context, if nested.
   */
  readonly parentId?: string;

  /**
   * Flag indicating if the transaction is nested.
   */
  readonly isNested: boolean;

  /**
   * The underlying database connection/transaction client.
   */
  readonly client: TClient;

  /**
   * Current lifecycle state of the transaction.
   */
  state: TransactionState;
}

/**
 * Manager that handles transaction context propagation via Node.js AsyncLocalStorage.
 * Implements REQUIRED transaction propagation: nested scopes reuse the active parent transaction.
 */
@Injectable()
export class TransactionManager<TClient = any> {
  private readonly als = new AsyncLocalStorage<TransactionContext<TClient>>();

  /**
   * Retrieves the current active transaction context if one exists.
   *
   * @returns The active TransactionContext, or null.
   */
  public getActiveContext(): TransactionContext<TClient> | null {
    return this.als.getStore() || null;
  }

  /**
   * Retrieves the active database transaction client from the current context.
   *
   * @returns The active database client instance, or null.
   */
  public getActiveClient<T = TClient>(): T | null {
    return (this.getActiveContext()?.client as T) || null;
  }

  /**
   * Checks if execution is currently within a transaction block.
   *
   * @returns True if a transaction is active, false otherwise.
   */
  public isWithinTransaction(): boolean {
    return this.getActiveContext() !== null;
  }

  /**
   * Explicitly begins a new transaction context.
   * If a parent transaction exists, the REQUIRED policy is applied: the new context
   * becomes a nested context that reuses the parent's connection client.
   *
   * @param client - The database client or transaction instance.
   * @returns A new TransactionContext object in "active" state.
   */
  public begin(client: TClient): TransactionContext<TClient> {
    const parent = this.getActiveContext();
    const isNested = parent !== null;

    const context: TransactionContext<TClient> = {
      id: randomUUID(),
      parentId: parent?.id,
      isNested,
      client: isNested ? parent.client : client,
      state: "active",
    };

    return context;
  }

  /**
   * Commits the given transaction context.
   * Throws TransactionException if the context is not active.
   *
   * @param context - The transaction context to commit.
   */
  public commit(context: TransactionContext<TClient>): void {
    if (context.state !== "active") {
      throw new TransactionException(`Cannot commit transaction in '${context.state}' state.`);
    }
    context.state = "committed";
  }

  /**
   * Rolls back the given transaction context.
   * Throws TransactionException if the context is not active.
   *
   * @param context - The transaction context to roll back.
   */
  public rollback(context: TransactionContext<TClient>): void {
    if (context.state !== "active") {
      throw new TransactionException(`Cannot rollback transaction in '${context.state}' state.`);
    }
    context.state = "rolled_back";
  }

  /**
   * Executes the provided function within the given transaction context using AsyncLocalStorage.
   *
   * @param context - The active transaction context.
   * @param work - The function block to execute.
   * @returns The resolved result of the work function.
   */
  public async run<T>(context: TransactionContext<TClient>, work: () => Promise<T>): Promise<T> {
    return this.als.run(context, work);
  }

  /**
   * Helper that wraps executing a block of work inside a transaction.
   * If a transaction is already active, it executes the work immediately (nested).
   * Otherwise, it starts a new transaction using the database client's transaction callback interface,
   * setting up and executing the lifecycle hooks.
   *
   * @param dbClient - The root Drizzle database client instance.
   * @param work - The function block to execute within the transaction context.
   * @returns The resolved result of the work function.
   */
  public async runInTransaction<T>(
    dbClient: { transaction: (cb: (tx: TClient) => Promise<T>) => Promise<T> },
    work: () => Promise<T>
  ): Promise<T> {
    const activeContext = this.getActiveContext();
    if (activeContext) {
      // Re-use current active transaction (propagation = REQUIRED)
      return work();
    }

    return await dbClient.transaction(async (tx: TClient) => {
      const context = this.begin(tx);
      return this.run(context, async () => {
        try {
          const result = await work();
          this.commit(context);
          return result;
        } catch (error) {
          this.rollback(context);
          throw error;
        }
      });
    });
  }
}
