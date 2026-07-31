import type { JobHelpers, Runner, RunnerOptions } from "graphile-worker";

export const QUEUE_SERVICE = "IQueueService";
export const QUEUE_RUNNER_FACTORY = Symbol("QUEUE_RUNNER_FACTORY");

export interface JobPayloadVersionWrapper {
  payloadVersion: string;
  schemaVersion: string;
  data: Record<string, unknown>;
}

export interface IQueueService {
  dispatch(taskName: string, payload: JobPayloadVersionWrapper, priority?: number): Promise<string>;
}

export type QueueRunnerOptions = Required<
  Pick<
    RunnerOptions,
    "pgPool" | "taskList" | "concurrency" | "pollInterval" | "noHandleSignals" | "events" | "logger"
  >
>;

export type QueueRunnerFactory = (options: QueueRunnerOptions) => Promise<Runner>;

export type QueueTaskHandler = (
  payload: JobPayloadVersionWrapper,
  helpers: JobHelpers
) => Promise<void>;
