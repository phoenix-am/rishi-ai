export class QueueValidationException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QueueValidationException";
  }
}

export class QueueUnavailableException extends Error {
  constructor(message = "The queue is not accepting jobs.") {
    super(message);
    this.name = "QueueUnavailableException";
  }
}

export class QueueConfigurationException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QueueConfigurationException";
  }
}

export class TransientExecutionException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransientExecutionException";
  }
}

export class FatalExecutionException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FatalExecutionException";
  }
}

export class AdvisoryLockContextException extends Error {
  constructor() {
    super("PostgreSQL transaction advisory locks require an active transaction context.");
    this.name = "AdvisoryLockContextException";
  }
}
