export { SnapshotImmutableException } from "./errors/snapshot-immutable.exception.js";

export class SnapshotException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SnapshotException";
  }
}

export class InvalidSnapshotInputException extends SnapshotException {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSnapshotInputException";
  }
}

export class SnapshotSourceUnavailableException extends SnapshotException {
  constructor() {
    super("An active, curated knowledge asset is not available to the requested project.");
    this.name = "SnapshotSourceUnavailableException";
  }
}

export class SnapshotNotFoundException extends SnapshotException {
  constructor() {
    super("Snapshot was not found in the requested project.");
    this.name = "SnapshotNotFoundException";
  }
}

export class SnapshotConflictException extends SnapshotException {
  constructor() {
    super("Snapshot creation conflicts with another active operation for this knowledge asset.");
    this.name = "SnapshotConflictException";
  }
}

export class SnapshotIntegrityException extends SnapshotException {
  constructor() {
    super("Snapshot metadata exists without a complete immutable chunk set.");
    this.name = "SnapshotIntegrityException";
  }
}
