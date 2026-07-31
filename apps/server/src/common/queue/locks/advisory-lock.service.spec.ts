import { describe, expect, it, vi } from "vitest";
import { AdvisoryLockService } from "./advisory-lock.service.js";
import { AdvisoryLockContextException } from "../queue.errors.js";

describe("AdvisoryLockService", () => {
  const key = "7c5e2a31-9b1b-4d7a-8f4b-3c7f9e0d2a4b";

  it.each([true, false])("returns the PostgreSQL lock result %s", async (acquired) => {
    const execute = vi.fn().mockResolvedValue({ rows: [{ acquired }] });
    const service = new AdvisoryLockService(
      { client: { execute } } as never,
      { isWithinTransaction: vi.fn(() => true) } as never
    );

    await expect(service.tryAcquireLock(key)).resolves.toBe(acquired);
    expect(execute).toHaveBeenCalledOnce();
  });

  it("requires a transaction so the lock remains held for the unit of work", async () => {
    const service = new AdvisoryLockService(
      { client: { execute: vi.fn() } } as never,
      { isWithinTransaction: vi.fn(() => false) } as never
    );

    await expect(service.tryAcquireLock(key)).rejects.toBeInstanceOf(AdvisoryLockContextException);
  });
});
