import { describe, it, expect, vi, beforeEach } from "vitest";
import { TransactionManager, TransactionException } from "./index.js";

describe("Transaction Manager", () => {
  let txManager: TransactionManager;
  let mockDbClient: any;

  beforeEach(() => {
    txManager = new TransactionManager();
    mockDbClient = {
      transaction: vi.fn().mockImplementation(async (callback) => {
        const mockTxClient = { name: "mocked-drizzle-tx" };
        return callback(mockTxClient);
      }),
    };
  });

  it("should establish context propagation and retrieve active client", async () => {
    let capturedClient: any = null;

    await txManager.runInTransaction(mockDbClient, async () => {
      capturedClient = txManager.getActiveClient();
    });

    expect(mockDbClient.transaction).toHaveBeenCalledTimes(1);
    expect(capturedClient).toEqual({ name: "mocked-drizzle-tx" });
  });

  it("should reuse active client context for nested transactions (REQUIRED propagation)", async () => {
    let innerCaptured: any = null;
    let outerCaptured: any = null;

    await txManager.runInTransaction(mockDbClient, async () => {
      outerCaptured = txManager.getActiveClient();
      await txManager.runInTransaction(mockDbClient, async () => {
        innerCaptured = txManager.getActiveClient();
      });
    });

    // Outer call invokes transaction callback, nested call skips it and reuses the active client
    expect(mockDbClient.transaction).toHaveBeenCalledTimes(1);
    expect(outerCaptured).toBe(innerCaptured);
  });

  it("should support manual transaction lifecycle management", () => {
    const client = { connection: "dummy" };
    const context = txManager.begin(client);

    expect(context.state).toBe("active");
    expect(context.client).toBe(client);
    expect(context.isNested).toBe(false);

    txManager.commit(context);
    expect(context.state).toBe("committed");
  });

  it("should fail when committing or rolling back a non-active transaction context", () => {
    const client = { connection: "dummy" };
    const context = txManager.begin(client);

    txManager.commit(context);

    // Commit again
    expect(() => txManager.commit(context)).toThrow(TransactionException);
    // Rollback committed
    expect(() => txManager.rollback(context)).toThrow(TransactionException);
  });

  it("should support manual nested transaction tracking properties", () => {
    const rootClient = { connection: "root" };
    const rootContext = txManager.begin(rootClient);

    txManager.run(rootContext, async () => {
      expect(txManager.getActiveContext()?.id).toBe(rootContext.id);

      const nestedContext = txManager.begin({ connection: "ignored-nested-arg" });
      expect(nestedContext.isNested).toBe(true);
      expect(nestedContext.parentId).toBe(rootContext.id);
      expect(nestedContext.client).toBe(rootClient); // reuses parent client
    });
  });
});
