import { describe, it, expect } from "vitest";
import { DrizzleProjectRepository } from "./repositories/project.js";
import { DrizzleContentAssetRepository } from "./repositories/content-asset.js";

describe("Database Persistence Layer", () => {
  it("should have repositories defined", () => {
    expect(DrizzleProjectRepository).toBeDefined();
    expect(DrizzleContentAssetRepository).toBeDefined();
  });
});
