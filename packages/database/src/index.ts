import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { sql } from "drizzle-orm";
import type { ConfigService } from "@rishi/config";
import type { TransactionManager } from "@rishi/transaction";

const { Pool } = pg;

/**
 * Type representation of the underlying Drizzle PostgreSQL database client.
 */
export type DatabaseClient = NodePgDatabase<Record<string, never>>;

/**
 * Creates and initializes a lazy Drizzle database client pool.
 * No network connections are opened during this call; the pg Pool opens connections lazily as queries are issued.
 *
 * @param config - The config service to retrieve DATABASE_URL.
 * @returns An object containing the pg pool instance and the Drizzle client.
 */
export function createDatabaseClient(config: ConfigService): { pool: pg.Pool; db: DatabaseClient } {
  const connectionString = config.get("DATABASE_URL");
  const pool = new Pool({
    connectionString,
  });
  const db = drizzle(pool);
  return { pool, db };
}

/**
 * Service that encapsulates database pool connectivity, query execution,
 * health checks, connection cleanup, and integration with transaction contexts.
 */
export class DatabaseService {
  private readonly pool: pg.Pool;
  private readonly db: DatabaseClient;
  private readonly txManager: TransactionManager;
  private isPoolClosed = false;

  constructor(pool: pg.Pool, db: DatabaseClient, txManager: TransactionManager) {
    this.pool = pool;
    this.db = db;
    this.txManager = txManager;
  }

  /**
   * Retrieves the active database execution client.
   * If a transaction is currently active in the transaction manager's ALS context,
   * returns the transaction client. Otherwise, returns the default client.
   *
   * @returns The active client connection.
   */
  public get client(): DatabaseClient {
    return this.txManager.getActiveClient<DatabaseClient>() || this.db;
  }

  /**
   * Pings the database to verify active network connectivity by executing a quick query.
   *
   * @returns Promise resolving to true if connection is alive, or false on error.
   */
  public async ping(): Promise<boolean> {
    if (this.isPoolClosed) {
      return false;
    }
    try {
      await this.db.execute(sql`SELECT 1`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Checks if the connection pool is currently active and not terminated.
   * Note that the pg Pool opens individual connections lazily, so this reflects
   * whether the manager is initialized and open for execution.
   *
   * @returns True if the pool has not been closed, false otherwise.
   */
  public isConnected(): boolean {
    return !this.isPoolClosed;
  }

  /**
   * Gracefully terminates the connection pool and cleans up all active database connection resources.
   */
  public async close(): Promise<void> {
    if (this.isPoolClosed) {
      return;
    }
    this.isPoolClosed = true;
    await this.pool.end();
  }
}
