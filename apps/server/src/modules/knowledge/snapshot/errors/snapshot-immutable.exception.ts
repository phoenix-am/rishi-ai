export class SnapshotImmutableException extends Error {
  constructor() {
    super("Snapshot records and chunks are immutable and cannot be updated.");
    this.name = "SnapshotImmutableException";
  }
}
