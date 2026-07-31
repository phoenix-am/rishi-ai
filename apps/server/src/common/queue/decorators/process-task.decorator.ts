import { SetMetadata } from "@nestjs/common";
import { QueueConfigurationException } from "../queue.errors.js";

export interface ProcessTaskOptions {
  concurrency?: number;
}

export interface ProcessTaskMetadata extends ProcessTaskOptions {
  taskName: string;
}

export const PROCESS_TASK_METADATA_KEY = "PROCESS_TASK_METADATA";

export function ProcessTask(taskName: string, options: ProcessTaskOptions = {}): MethodDecorator {
  const normalizedName = taskName.trim();
  if (!normalizedName) {
    throw new QueueConfigurationException("Queue task names must not be empty.");
  }
  if (
    options.concurrency !== undefined &&
    (!Number.isInteger(options.concurrency) || options.concurrency < 1)
  ) {
    throw new QueueConfigurationException("Queue task concurrency must be a positive integer.");
  }

  return SetMetadata(PROCESS_TASK_METADATA_KEY, {
    taskName: normalizedName,
    ...options,
  } satisfies ProcessTaskMetadata);
}
