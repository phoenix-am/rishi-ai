import { AsyncLocalStorage } from "async_hooks";

export interface RequestStore {
  correlationId: string;
}

/**
 * Context manager providing AsyncLocalStorage wrapper to store and propagate request metadata.
 */
export class RequestContext {
  private static readonly storage = new AsyncLocalStorage<RequestStore>();

  /**
   * Executes the provided function within the given request store context.
   *
   * @param store - The request context store.
   * @param fn - The function to run within the context.
   * @returns The return value of the function.
   */
  public static run<T>(store: RequestStore, fn: () => T): T {
    return this.storage.run(store, fn);
  }

  /**
   * Safely retrieves the active request correlation ID.
   *
   * @returns The correlation ID if in request context, undefined otherwise.
   */
  public static getCorrelationId(): string | undefined {
    return this.storage.getStore()?.correlationId;
  }
}
