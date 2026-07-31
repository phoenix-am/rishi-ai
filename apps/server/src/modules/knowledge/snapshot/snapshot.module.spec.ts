import { describe, expect, it } from "vitest";
import * as publicApi from "./index.js";
import { SnapshotRepository } from "./repository/snapshot.repository.js";
import { SnapshotImmutableException } from "./snapshot.errors.js";
import { SnapshotModule } from "./snapshot.module.js";
import { SnapshotService } from "./snapshot.service.js";

describe("SnapshotModule", () => {
  it("exports the approved module, service, repository, and errors", () => {
    expect(publicApi.SnapshotModule).toBe(SnapshotModule);
    expect(publicApi.SnapshotService).toBe(SnapshotService);
    expect(publicApi.SnapshotRepository).toBe(SnapshotRepository);
    expect(publicApi.SnapshotImmutableException).toBe(SnapshotImmutableException);
  });

  it("contains no update path and fails explicit mutation attempts before SQL", () => {
    const repository = new SnapshotRepository({} as never, {} as never);
    expect(() => repository.update()).toThrow(SnapshotImmutableException);
  });
});
