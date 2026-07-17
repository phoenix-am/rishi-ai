import { describe, it, expect, vi } from "vitest";
import { createDatabaseClient, DatabaseService } from "./index.js";
import { ConfigService } from "@rishi/config";
import { TransactionManager } from "@rishi/transaction";

describe("Database Module", () => {
  const mockConfig = new ConfigService({
    NODE_ENV: "test",
    PORT: "3000",
    DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/rishi_ai",
    LOG_LEVEL: "info",
  });

  it("should initialize client and pool lazily without opening network connections on construction", () => {
    const { pool, db } = createDatabaseClient(mockConfig);
    expect(pool).toBeDefined();
    expect(db).toBeDefined();
    expect((pool as any).totalCount || 0).toBe(0);
  });

  it("should return connection state details and allow pinging the database", async () => {
    const mockExecute = vi.fn().mockResolvedValue({ rows: [[1]] });
    const mockPool = {
      end: vi.fn().mockResolvedValue(undefined),
    } as any;
    const mockDb = {
      execute: mockExecute,
    } as any;

    const txManager = new TransactionManager();
    const dbService = new DatabaseService(mockPool, mockDb, txManager);

    expect(dbService.isConnected()).toBe(true);

    const pingResult = await dbService.ping();
    expect(pingResult).toBe(true);
    expect(mockExecute).toHaveBeenCalledWith(expect.any(Object));
  });

  it("should fallback to default client when not within a transaction", () => {
    const mockPool = {} as any;
    const mockDb = { name: "default-db-client" } as any;
    const txManager = new TransactionManager();

    const dbService = new DatabaseService(mockPool, mockDb, txManager);

    expect(dbService.client).toBe(mockDb);
  });

  it("should resolve the active transaction client if within a transaction context", async () => {
    const mockPool = {} as any;
    const mockDb = { name: "default-db-client" } as any;
    const mockTxClient = { name: "active-tx-client" };

    const txManager = new TransactionManager();
    const dbService = new DatabaseService(mockPool, mockDb, txManager);

    const context = txManager.begin(mockTxClient);

    await txManager.run(context, async () => {
      expect(dbService.client).toBe(mockTxClient);
    });
  });

  it("should close connections gracefully", async () => {
    const mockPool = {
      end: vi.fn().mockResolvedValue(undefined),
    } as any;
    const mockDb = {} as any;
    const txManager = new TransactionManager();

    const dbService = new DatabaseService(mockPool, mockDb, txManager);

    await dbService.close();
    expect(dbService.isConnected()).toBe(false);
    expect(mockPool.end).toHaveBeenCalledTimes(1);

    // Ping should return false after pool is closed
    const pingResult = await dbService.ping();
    expect(pingResult).toBe(false);
  });
});
