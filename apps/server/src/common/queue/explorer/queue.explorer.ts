import { Inject, Injectable } from "@nestjs/common";
import { DiscoveryService, MetadataScanner, Reflector } from "@nestjs/core";
import { DatabaseService } from "@rishi/database";
import type { ILogger } from "@rishi/logger";
import { TransactionManager } from "@rishi/transaction";
import type { JobHelpers, Task, TaskList } from "graphile-worker";
import { DeadLetterService } from "../dead-letter.service.js";
import {
  PROCESS_TASK_METADATA_KEY,
  type ProcessTaskMetadata,
} from "../decorators/process-task.decorator.js";
import {
  FatalExecutionException,
  QueueConfigurationException,
  TransientExecutionException,
} from "../queue.errors.js";
import type { JobPayloadVersionWrapper } from "../queue.contracts.js";

type DiscoveredHandler = (
  payload: JobPayloadVersionWrapper,
  helpers: JobHelpers
) => Promise<void> | void;

interface WaitingTask {
  resolve: () => void;
  reject: (error: Error) => void;
  signal: AbortSignal;
  onAbort: () => void;
}

class ConcurrencyGate {
  private active = 0;
  private readonly waiting: WaitingTask[] = [];

  constructor(private readonly limit: number) {}

  async run(signal: AbortSignal, work: () => Promise<void>): Promise<void> {
    if (signal.aborted) throw new TransientExecutionException("Queue task execution was aborted.");
    if (this.active >= this.limit) {
      await new Promise<void>((resolve, reject) => {
        const waitingTask: WaitingTask = {
          resolve,
          reject,
          signal,
          onAbort: () => {
            const index = this.waiting.indexOf(waitingTask);
            if (index >= 0) this.waiting.splice(index, 1);
            reject(new TransientExecutionException("Queue task execution was aborted."));
          },
        };
        signal.addEventListener("abort", waitingTask.onAbort, { once: true });
        this.waiting.push(waitingTask);
      });
    }
    this.active += 1;
    try {
      await work();
    } finally {
      this.active -= 1;
      const next = this.waiting.shift();
      if (next) {
        next.signal.removeEventListener("abort", next.onAbort);
        next.resolve();
      }
    }
  }
}

@Injectable()
export class QueueExplorer {
  constructor(
    @Inject(DiscoveryService) private readonly discovery: DiscoveryService,
    @Inject(MetadataScanner) private readonly scanner: MetadataScanner,
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(TransactionManager) private readonly transactions: TransactionManager,
    @Inject(DeadLetterService) private readonly deadLetters: DeadLetterService,
    @Inject("ILogger") private readonly logger: ILogger
  ) {}

  discoverTaskList(): TaskList {
    const taskList: TaskList = {};

    for (const wrapper of this.discovery.getProviders()) {
      const instance = wrapper.instance as Record<string, unknown> | undefined;
      if (!instance || !wrapper.metatype) continue;

      const prototype = Object.getPrototypeOf(instance) as object | null;
      if (!prototype) continue;

      for (const methodName of this.scanner.getAllMethodNames(prototype)) {
        const method = instance[methodName];
        if (typeof method !== "function") continue;
        const metadata = this.reflector.get<ProcessTaskMetadata>(PROCESS_TASK_METADATA_KEY, method);
        if (!metadata) continue;
        if (taskList[metadata.taskName]) {
          throw new QueueConfigurationException(
            `Duplicate queue task registration: ${metadata.taskName}`
          );
        }

        const handler = method.bind(instance) as DiscoveredHandler;
        const gate = new ConcurrencyGate(metadata.concurrency ?? Number.MAX_SAFE_INTEGER);
        taskList[metadata.taskName] = this.createTask(metadata.taskName, handler, gate);
      }
    }

    return taskList;
  }

  private createTask(taskName: string, handler: DiscoveredHandler, gate: ConcurrencyGate): Task {
    return async (rawPayload: unknown, helpers: JobHelpers) => {
      try {
        const payload = this.validatePayload(rawPayload);
        await gate.run(helpers.abortSignal, () =>
          this.transactions.runInTransaction<void>(this.database.client, async () => {
            await handler(payload, helpers);
          })
        );
      } catch (error) {
        if (!(error instanceof FatalExecutionException)) throw error;

        await this.deadLetters.record({
          queueJobId: helpers.job.id,
          taskName,
          payload: rawPayload,
          errorName: error.name,
          errorMessage: error.message,
          attempts: helpers.job.attempts,
        });
        this.logger.error("Queue job moved to the dead-letter ledger.", {
          queueJobId: helpers.job.id,
          taskName,
          errorName: error.name,
        });
      }
    };
  }

  private validatePayload(payload: unknown): JobPayloadVersionWrapper {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new FatalExecutionException("Queue payload must be a versioned object.");
    }
    const candidate = payload as Partial<JobPayloadVersionWrapper>;
    if (
      typeof candidate.payloadVersion !== "string" ||
      !candidate.payloadVersion.trim() ||
      typeof candidate.schemaVersion !== "string" ||
      !candidate.schemaVersion.trim() ||
      !candidate.data ||
      typeof candidate.data !== "object" ||
      Array.isArray(candidate.data)
    ) {
      throw new FatalExecutionException("Queue payload version metadata or data is invalid.");
    }
    return candidate as JobPayloadVersionWrapper;
  }
}
