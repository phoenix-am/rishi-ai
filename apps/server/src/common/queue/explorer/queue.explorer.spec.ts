import { describe, expect, it, vi } from "vitest";
import { Reflector } from "@nestjs/core";
import { TransactionManager } from "@rishi/transaction";
import type { ILogger } from "@rishi/logger";
import type { JobHelpers } from "graphile-worker";
import { ProcessTask } from "../decorators/process-task.decorator.js";
import { QueueExplorer } from "./queue.explorer.js";
import { FatalExecutionException, TransientExecutionException } from "../queue.errors.js";

class TestProcessor {
  readonly execute = vi.fn(async (payload: unknown) => {
    void payload;
  });

  @ProcessTask("test_task", { concurrency: 1 })
  async process(payload: { data: Record<string, unknown> }): Promise<void> {
    await this.execute(payload);
  }
}

function makeLogger(): ILogger {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
}

function makeHelpers(signal = new AbortController().signal, id = "job-1"): JobHelpers {
  return {
    job: { id, attempts: 1 } as never,
    abortSignal: signal,
  } as unknown as JobHelpers;
}

function makeExplorer(processor: TestProcessor, record = vi.fn()) {
  const transactionManager = new TransactionManager<unknown>();
  const client = {
    transaction: vi.fn(async (callback: (tx: unknown) => Promise<void>) => callback({})),
  };
  return {
    explorer: new QueueExplorer(
      { getProviders: vi.fn(() => [{ instance: processor, metatype: TestProcessor }]) } as never,
      {
        getAllMethodNames: vi.fn(() => ["process"]),
      } as never,
      new Reflector(),
      { client } as never,
      transactionManager,
      { record } as never,
      makeLogger()
    ),
    record,
  };
}

describe("QueueExplorer", () => {
  it("discovers decorated methods and executes them in a transaction", async () => {
    const processor = new TestProcessor();
    const { explorer } = makeExplorer(processor);
    const task = explorer.discoverTaskList().test_task!;
    const payload = { payloadVersion: "1", schemaVersion: "1", data: { value: 1 } };

    await task(payload, makeHelpers());
    expect(processor.execute).toHaveBeenCalledWith(payload);
  });

  it("moves fatal failures to the dead-letter ledger without retrying", async () => {
    const processor = new TestProcessor();
    processor.execute.mockRejectedValueOnce(new FatalExecutionException("invalid"));
    const { explorer, record } = makeExplorer(processor);

    await explorer.discoverTaskList().test_task!(
      { payloadVersion: "1", schemaVersion: "1", data: {} },
      makeHelpers()
    );
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ queueJobId: "job-1", errorName: "FatalExecutionException" })
    );
  });

  it("propagates transient failures for Graphile Worker retry scheduling", async () => {
    const processor = new TestProcessor();
    processor.execute.mockRejectedValueOnce(new TransientExecutionException("retry"));
    const { explorer, record } = makeExplorer(processor);

    await expect(
      explorer.discoverTaskList().test_task!(
        { payloadVersion: "1", schemaVersion: "1", data: {} },
        makeHelpers()
      )
    ).rejects.toBeInstanceOf(TransientExecutionException);
    expect(record).not.toHaveBeenCalled();
  });

  it("treats incompatible payloads as fatal and records them", async () => {
    const processor = new TestProcessor();
    const { explorer, record } = makeExplorer(processor);

    await explorer.discoverTaskList().test_task!({ data: {} }, makeHelpers());
    expect(processor.execute).not.toHaveBeenCalled();
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ errorName: "FatalExecutionException" })
    );
  });

  it("releases queued concurrency slots when shutdown aborts a waiting task", async () => {
    const processor = new TestProcessor();
    let release!: () => void;
    let started!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    const ready = new Promise<void>((resolve) => (started = resolve));
    processor.execute.mockImplementationOnce(async () => {
      started();
      await held;
    });
    const { explorer } = makeExplorer(processor);
    const task = explorer.discoverTaskList().test_task!;
    const payload = { payloadVersion: "1", schemaVersion: "1", data: {} };
    const first = task(payload, makeHelpers(undefined, "job-1"));
    await ready;
    const controller = new AbortController();
    const second = task(payload, makeHelpers(controller.signal, "job-2"));
    controller.abort();

    await expect(second).rejects.toBeInstanceOf(TransientExecutionException);
    release();
    await first;
  });
});
