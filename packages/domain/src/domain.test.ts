import { describe, it, expect } from "vitest";
import { Project, ContentAsset } from "./entities.js";

describe("Domain Layer", () => {
  it("should create Project entity", () => {
    const project = new Project("id-1", "ws-1", "My Project");
    expect(project.id).toBe("id-1");
    expect(project.workspaceId).toBe("ws-1");
    expect(project.name).toBe("My Project");
  });

  it("should create ContentAsset entity", () => {
    const asset = new ContentAsset("id-2", "proj-1", "ws-1", "SCRIPT");
    expect(asset.type).toBe("SCRIPT");
  });
});
