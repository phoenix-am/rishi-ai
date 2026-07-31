import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import type { ConfigService } from "@rishi/config";
import type { ILogger } from "@rishi/logger";
import type { Job, Runner, WorkerEvents } from "graphile-worker";
import { QueueService } from "./queue.service.js";
import { QueueUnavailableException, QueueValidationException } from "./queue.errors.js";

function makeConfig(overrides: Partial<Record<string, number>> = {}): ConfigService {
  const values: Record<string, number> = {
    QUEUE_CONCURRENCY: 2,
    QUEUE_POLL_INTERVAL_MS: 2_000,
    QUEUE_MAX_ATTEMPTS: 7,
    QUEUE_SHUTDOWN_TIMEOUT_MS: 15_000,
    ...overrides,
  };
  return { get: vi.fn((key: string) => values[key]) } as unknown as ConfigService;
}

function makeLogger(): ILogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
}

function makePool() {
  return { on: vi.fn(), off: vi.fn() } as never;
}

function makeJob(id = "job-1"): Job {
  return {
    id,
    task_identifier: "test_task",
    payload: { payloadVersion: "1", schemaVersion: "1", data: {} },
    attempts: 1,
    max_attempts: 7,
  } as Job;
}

describe("QueueService", () => {
  it("starts the worker and dispatches a validated priority job", async () => {
    const addJob = vi.fn().mockResolvedValue(makeJob());
    const runner = {
      addJob,
      stop: vi.fn().mockResolvedValue(undefined),
      kill: vi.fn().mockResolvedValue(undefined),
    } as unknown as Runner;
    const runnerFactory = vi.fn().mockResolvedValue(runner);
    const service = new QueueService(
      makeConfig(),
      { discoverTaskList: vi.fn(() => ({ test_task: vi.fn() })) } as never,
      { record: vi.fn() } as never,
      { pool: makePool() },
      runnerFactory,
      makeLogger()
    );

    await service.onApplicationBootstrap();
    const payload = { payloadVersion: "1", schemaVersion: "1", data: { value: 42 } };
    await expect(service.dispatch(" test_task ", payload, 10)).resolves.toBe("job-1");
    expect(addJob).toHaveBeenCalledWith("test_task", payload, {
      priority: 10,
      maxAttempts: 7,
    });
    expect(runnerFactory).toHaveBeenCalledWith(
      expect.objectContaining({ concurrency: 2, pollInterval: 2_000, noHandleSignals: true })
    );
  });

  it.each([-1, 1.5, 101])("rejects invalid priority %s", async (priority) => {
    const service = new QueueService(
      makeConfig(),
      { discoverTaskList: vi.fn() } as never,
      { record: vi.fn() } as never,
      { pool: makePool() },
      vi.fn() as never,
      makeLogger()
    );

    await expect(
      service.dispatch("test", { payloadVersion: "1", schemaVersion: "1", data: {} }, priority)
    ).rejects.toBeInstanceOf(QueueValidationException);
  });

  it("rejects dispatch before startup and after shutdown", async () => {
    const runner = {
      addJob: vi.fn(),
      stop: vi.fn().mockResolvedValue(undefined),
      kill: vi.fn(),
    } as unknown as Runner;
    const service = new QueueService(
      makeConfig(),
      { discoverTaskList: vi.fn(() => ({})) } as never,
      { record: vi.fn() } as never,
      { pool: makePool() },
      vi.fn().mockResolvedValue(runner),
      makeLogger()
    );
    const payload = { payloadVersion: "1", schemaVersion: "1", data: {} };

    await expect(service.dispatch("test", payload)).rejects.toBeInstanceOf(
      QueueUnavailableException
    );
    await service.onApplicationBootstrap();
    await service.onApplicationShutdown();
    await expect(service.dispatch("test", payload)).rejects.toBeInstanceOf(
      QueueUnavailableException
    );
  });

  it("persists permanently failed jobs from worker events", async () => {
    const record = vi.fn().mockResolvedValue(undefined);
    let events: WorkerEvents | undefined;
    const runner = {
      addJob: vi.fn(),
      stop: vi.fn(),
      kill: vi.fn(),
    } as unknown as Runner;
    const service = new QueueService(
      makeConfig(),
      { discoverTaskList: vi.fn(() => ({ test_task: vi.fn() })) } as never,
      { record } as never,
      { pool: makePool() },
      vi.fn(async (options) => {
        events = options.events;
        return runner;
      }),
      makeLogger()
    );
    await service.onApplicationBootstrap();

    (events as EventEmitter).emit("job:failed", {
      job: makeJob(),
      error: new Error("permanent"),
    });
    await vi.waitFor(() => expect(record).toHaveBeenCalledOnce());
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ queueJobId: "job-1", attempts: 1, errorMessage: "permanent" })
    );
  });

  it("force-unlocks active jobs after the graceful shutdown deadline", async () => {
    vi.useFakeTimers();
    try {
      const runner = {
        addJob: vi.fn(),
        stop: vi.fn(() => new Promise<void>(() => undefined)),
        kill: vi.fn().mockResolvedValue(undefined),
      } as unknown as Runner;
      const service = new QueueService(
        makeConfig({ QUEUE_SHUTDOWN_TIMEOUT_MS: 1_000 }),
        { discoverTaskList: vi.fn(() => ({})) } as never,
        { record: vi.fn() } as never,
        { pool: makePool() },
        vi.fn().mockResolvedValue(runner),
        makeLogger()
      );
      await service.onApplicationBootstrap();

      const shutdown = service.onApplicationShutdown();
      await vi.advanceTimersByTimeAsync(1_000);
      await shutdown;
      expect(runner.kill).toHaveBeenCalledWith("Queue shutdown timeout");
    } finally {
      vi.useRealTimers();
    }
  });
});
