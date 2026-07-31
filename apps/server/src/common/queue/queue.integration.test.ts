import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { run } from "graphile-worker";
import { createDatabaseClient, DatabaseService, runDatabaseMigrations } from "@rishi/database";
import type { ConfigService } from "@rishi/config";
import type { ILogger } from "@rishi/logger";
import { TransactionManager } from "@rishi/transaction";
import { QueueService } from "./queue.service.js";
import { DeadLetterService } from "./dead-letter.service.js";
import { AdvisoryLockService } from "./locks/advisory-lock.service.js";
import type { JobPayloadVersionWrapper, QueueRunnerFactory } from "./queue.contracts.js";

const integrationEnabled = process.env.QUEUE_INTEGRATION_TESTS === "true";

function config(values: Record<string, unknown>): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

const logger: ILogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

describe.runIf(integrationEnabled)("Queue PostgreSQL integration", () => {
  const databaseName = `rishi_tdd008_${randomUUID().replaceAll("-", "")}`;
  const sourceUrl = process.env.DATABASE_URL;
  let admin: ReturnType<typeof createDatabaseClient>;
  let database: ReturnType<typeof createDatabaseClient>;
  let databaseUrl: URL;
  let queue: QueueService;

  beforeAll(async () => {
    if (!sourceUrl) throw new Error("DATABASE_URL is required when QUEUE_INTEGRATION_TESTS=true.");

    const adminUrl = new URL(sourceUrl);
    adminUrl.pathname = "/postgres";
    databaseUrl = new URL(sourceUrl);
    databaseUrl.pathname = `/${databaseName}`;
    admin = createDatabaseClient(config({ DATABASE_URL: adminUrl.toString() }));
    await admin.pool.query(`CREATE DATABASE "${databaseName}"`);
    await runDatabaseMigrations(databaseUrl.toString());
    database = createDatabaseClient(config({ DATABASE_URL: databaseUrl.toString() }));
  }, 60_000);

  afterAll(async () => {
    await queue?.onApplicationShutdown();
    await database?.pool.end();
    if (admin) {
      await admin.pool.query(
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
        [databaseName]
      );
      await admin.pool.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
      await admin.pool.end();
    }
  });

  it("processes persisted jobs by priority and retries transient failures", async () => {
    const completed: string[] = [];
    let retryAttempts = 0;
    let releaseBlocker!: () => void;
    let blockerStarted!: () => void;
    const blockerReady = new Promise<void>((resolve) => (blockerStarted = resolve));
    const blocker = new Promise<void>((resolve) => (releaseBlocker = resolve));
    const taskList = {
      ordered: async (payload: unknown) => {
        const label = (payload as JobPayloadVersionWrapper).data.label as string;
        if (label === "blocker") {
          blockerStarted();
          await blocker;
        }
        completed.push(label);
      },
      retry_once: async () => {
        retryAttempts += 1;
        if (retryAttempts === 1) throw new Error("transient");
      },
      always_fail: async () => {
        throw new Error("permanent integration failure");
      },
    };
    const dbService = new DatabaseService(database.pool, database.db, new TransactionManager());
    queue = new QueueService(
      config({
        QUEUE_CONCURRENCY: 1,
        QUEUE_POLL_INTERVAL_MS: 100,
        QUEUE_MAX_ATTEMPTS: 2,
        QUEUE_SHUTDOWN_TIMEOUT_MS: 15_000,
      }),
      { discoverTaskList: () => taskList } as never,
      new DeadLetterService(dbService),
      database,
      run as QueueRunnerFactory,
      logger
    );
    await queue.onApplicationBootstrap();
    const payload = (label: string): JobPayloadVersionWrapper => ({
      payloadVersion: "1",
      schemaVersion: "1",
      data: { label },
    });

    await queue.dispatch("ordered", payload("blocker"), 0);
    await blockerReady;
    await queue.dispatch("ordered", payload("low"), 100);
    await queue.dispatch("ordered", payload("high"), 0);
    await queue.dispatch("retry_once", payload("retry"), 20);
    await queue.dispatch("always_fail", payload("dead-letter"), 20);
    releaseBlocker();

    await vi.waitFor(
      () => {
        expect(completed).toEqual(["blocker", "high", "low"]);
        expect(retryAttempts).toBe(2);
      },
      { timeout: 15_000, interval: 100 }
    );

    const queueSchema = await database.pool.query<{ exists: boolean }>(
      "SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'graphile_worker') AS exists"
    );
    expect(queueSchema.rows[0]?.exists).toBe(true);

    await vi.waitFor(
      async () => {
        const deadLetters = await database.pool.query<{
          task_name: string;
          attempts: number;
          payload: JobPayloadVersionWrapper;
        }>(
          "SELECT task_name, attempts, payload FROM queue_dead_letters WHERE task_name = 'always_fail'"
        );
        expect(deadLetters.rows).toEqual([
          expect.objectContaining({
            task_name: "always_fail",
            attempts: 2,
            payload: expect.objectContaining({ data: { label: "dead-letter" } }),
          }),
        ]);
      },
      { timeout: 15_000, interval: 100 }
    );
  }, 30_000);

  it("serializes the same resource through transaction advisory locks", async () => {
    const firstTransactions = new TransactionManager();
    const secondTransactions = new TransactionManager();
    const first = new AdvisoryLockService(
      new DatabaseService(database.pool, database.db, firstTransactions),
      firstTransactions
    );
    const second = new AdvisoryLockService(
      new DatabaseService(database.pool, database.db, secondTransactions),
      secondTransactions
    );
    const key = randomUUID();
    let release!: () => void;
    let acquired!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    const ready = new Promise<void>((resolve) => (acquired = resolve));

    const firstWork = firstTransactions.runInTransaction(database.db, async () => {
      expect(await first.tryAcquireLock(key)).toBe(true);
      acquired();
      await held;
    });
    await ready;
    await secondTransactions.runInTransaction(database.db, async () => {
      expect(await second.tryAcquireLock(key)).toBe(false);
    });
    release();
    await firstWork;
  });
});
