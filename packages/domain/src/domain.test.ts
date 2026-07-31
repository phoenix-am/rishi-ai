import { describe, it, expect } from "vitest";
import { Project, ContentAsset } from "./entities.js";
import { InvalidStateTransitionException } from "./exceptions.js";

describe("Domain Layer", () => {
  it("should create Project entity", () => {
    const project = new Project("id-1", "ws-1", "My Project");
    expect(project.id).toBe("id-1");
    expect(project.workspaceId).toBe("ws-1");
    expect(project.name).toBe("My Project");
    expect(project.status).toBe("draft");
    expect(project.version).toBe(1);
  });

  it("enforces sequential, backward, archive, and restore project transitions", () => {
    const draft = new Project("id-1", "ws-1", "My Project");
    const research = draft.transitionTo("research");
    const organized = research.transitionTo("knowledge_organized");
    const backstep = organized.transitionTo("draft");
    const archived = backstep.transitionTo("archived");
    const restored = archived.transitionTo("draft");

    expect(research.version).toBe(2);
    expect(backstep.hasStateDrift).toBe(true);
    expect(archived.previousState).toBe("draft");
    expect(restored.previousState).toBeNull();
    expect(restored.hasStateDrift).toBe(true);
  });

  it("rejects skipped forward transitions and incorrect archive restoration", () => {
    const draft = new Project("id-1", "ws-1", "My Project");
    expect(() => draft.transitionTo("script_generated")).toThrow(InvalidStateTransitionException);
    const archived = draft.transitionTo("archived");
    expect(() => archived.transitionTo("research")).toThrow(InvalidStateTransitionException);
  });

  it("should create ContentAsset entity", () => {
    const asset = new ContentAsset("id-2", "proj-1", "ws-1", "SCRIPT");
    expect(asset.type).toBe("SCRIPT");
  });
});
