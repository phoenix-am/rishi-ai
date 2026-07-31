import { Inject, Injectable, OnApplicationBootstrap, OnApplicationShutdown } from "@nestjs/common";
import { ConfigService } from "@rishi/config";
import type { ILogger } from "@rishi/logger";
import { EventEmitter } from "node:events";
import { Logger as GraphileLogger } from "graphile-worker";
import type { Job, Runner, RunnerOptions, WorkerEvents } from "graphile-worker";
import { QueueExplorer } from "./explorer/queue.explorer.js";
import {
  QUEUE_RUNNER_FACTORY,
  type IQueueService,
  type JobPayloadVersionWrapper,
  type QueueRunnerFactory,
} from "./queue.contracts.js";
import { QueueUnavailableException, QueueValidationException } from "./queue.errors.js";
import { DeadLetterService } from "./dead-letter.service.js";

interface DrizzleClientBundle {
  pool: NonNullable<RunnerOptions["pgPool"]>;
}

interface ErrorAwarePoolClient {
  on(event: "error", listener: (error: Error) => void): unknown;
}

@Injectable()
export class QueueService implements IQueueService, OnApplicationBootstrap, OnApplicationShutdown {
  private runner: Runner | null = null;
  private acceptingJobs = false;
  private readonly poolErrorHandler = (error: Error): void => {
    this.logger.error("Queue PostgreSQL pool emitted an idle-client error.", error);
  };
  private readonly poolClientErrorHandler = (error: Error): void => {
    this.logger.error("Queue PostgreSQL active client emitted an error.", error);
  };
  private readonly poolConnectHandler = (client: ErrorAwarePoolClient): void => {
    client.on("error", this.poolClientErrorHandler);
  };

  constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(QueueExplorer) private readonly explorer: QueueExplorer,
    @Inject(DeadLetterService) private readonly deadLetters: DeadLetterService,
    @Inject("DRIZZLE_CLIENT") private readonly database: DrizzleClientBundle,
    @Inject(QUEUE_RUNNER_FACTORY) private readonly runnerFactory: QueueRunnerFactory,
    @Inject("ILogger") private readonly logger: ILogger
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const taskList = this.explorer.discoverTaskList();
    const taskNames = Object.keys(taskList);
    if (taskNames.length === 0) {
      this.logger.info("Queue initialized without registered task handlers.");
    }

    const events = new EventEmitter() as WorkerEvents;
    this.bindObservability(events);
    this.database.pool.on("error", this.poolErrorHandler);
    this.database.pool.on("connect", this.poolConnectHandler);
    try {
      this.runner = await this.runnerFactory({
        pgPool: this.database.pool,
        taskList,
        concurrency: this.config.get("QUEUE_CONCURRENCY"),
        pollInterval: this.config.get("QUEUE_POLL_INTERVAL_MS"),
        noHandleSignals: true,
        events,
        logger: this.createWorkerLogger(),
      });
    } catch (error) {
      this.database.pool.off("error", this.poolErrorHandler);
      this.database.pool.off("connect", this.poolConnectHandler);
      throw error;
    }
    this.acceptingJobs = true;
    this.logger.info("Queue worker started.", {
      concurrency: this.config.get("QUEUE_CONCURRENCY"),
      registeredTaskCount: taskNames.length,
    });
  }

  async dispatch(
    taskName: string,
    payload: JobPayloadVersionWrapper,
    priority = 0
  ): Promise<string> {
    const normalizedTaskName = taskName.trim();
    if (!normalizedTaskName) throw new QueueValidationException("Task name must not be empty.");
    this.assertPayload(payload);
    if (!Number.isInteger(priority) || priority < 0 || priority > 100) {
      throw new QueueValidationException("Queue priority must be an integer from 0 to 100.");
    }
    if (!this.acceptingJobs || !this.runner) throw new QueueUnavailableException();

    const job = await this.runner.addJob(normalizedTaskName, payload, {
      priority,
      maxAttempts: this.config.get("QUEUE_MAX_ATTEMPTS"),
    });
    this.logger.info("Queue job dispatched.", {
      queueJobId: job.id,
      taskName: normalizedTaskName,
      priority,
    });
    return job.id;
  }

  async onApplicationShutdown(): Promise<void> {
    this.acceptingJobs = false;
    const runner = this.runner;
    this.runner = null;
    if (!runner) return;

    const timeoutMs = this.config.get("QUEUE_SHUTDOWN_TIMEOUT_MS");
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        runner.stop("Application shutdown"),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(
            () => reject(new Error(`Queue shutdown exceeded ${timeoutMs}ms.`)),
            timeoutMs
          );
        }),
      ]);
      this.logger.info("Queue worker stopped gracefully.");
    } catch (error) {
      this.logger.warn("Queue graceful shutdown timed out; unlocking active jobs.", {
        timeoutMs,
      });
      await runner.kill("Queue shutdown timeout");
      if (!(error instanceof Error)) throw error;
    } finally {
      if (timeout) clearTimeout(timeout);
      this.database.pool.off("error", this.poolErrorHandler);
      this.database.pool.off("connect", this.poolConnectHandler);
    }
  }

  private createWorkerLogger(): GraphileLogger {
    return new GraphileLogger((scope) => (level, message, metadata) => {
      const context = { ...scope, ...metadata };
      if (level === "error") this.logger.error(message, context);
      else if (level === "warning") this.logger.warn(message, context);
      else if (level === "debug") this.logger.debug(message, context);
      else this.logger.info(message, context);
    });
  }

  private bindObservability(events: WorkerEvents): void {
    events.on("job:start", ({ job }) => this.logJob("Queue job started.", job));
    events.on("job:success", ({ job }) => this.logJob("Queue job completed.", job));
    events.on("job:error", ({ job, error }) => {
      this.logger.warn("Queue job attempt failed and will be retried when eligible.", {
        queueJobId: job.id,
        taskName: job.task_identifier,
        attempt: job.attempts,
        maxAttempts: job.max_attempts,
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
    });
    events.on("job:failed", ({ job, error }) => {
      void this.recordPermanentlyFailedJob(job, error);
    });
    events.on("worker:fatalError", ({ error }) => {
      this.logger.error("Queue worker encountered an infrastructure failure.", {
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
    });
  }

  private logJob(message: string, job: Job): void {
    this.logger.info(message, {
      queueJobId: job.id,
      taskName: job.task_identifier,
      attempt: job.attempts,
    });
  }

  private async recordPermanentlyFailedJob(job: Job, error: unknown): Promise<void> {
    const normalizedError = error instanceof Error ? error : new Error("Unknown queue failure");
    try {
      await this.deadLetters.record({
        queueJobId: job.id,
        taskName: job.task_identifier,
        payload: job.payload,
        errorName: normalizedError.name,
        errorMessage: normalizedError.message,
        attempts: job.attempts,
      });
      this.logger.error("Queue job exhausted retries and entered the dead-letter ledger.", {
        queueJobId: job.id,
        taskName: job.task_identifier,
        attempts: job.attempts,
      });
    } catch (recordError) {
      this.logger.error(
        "Failed to persist queue dead-letter metadata.",
        recordError instanceof Error ? recordError : new Error("Unknown dead-letter failure")
      );
    }
  }

  private assertPayload(payload: JobPayloadVersionWrapper): void {
    if (
      !payload ||
      typeof payload !== "object" ||
      typeof payload.payloadVersion !== "string" ||
      !payload.payloadVersion.trim() ||
      typeof payload.schemaVersion !== "string" ||
      !payload.schemaVersion.trim() ||
      !payload.data ||
      typeof payload.data !== "object" ||
      Array.isArray(payload.data)
    ) {
      throw new QueueValidationException(
        "Queue payload must include version metadata and object data."
      );
    }
  }
}
