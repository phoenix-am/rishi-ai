import { describe, it, expect } from "vitest";
import {
  Email,
  SpeakingPacingInfo,
  ConfidenceScore,
  SourceCoverage,
  EntityNotFoundException,
  InvalidStateTransitionException,
  ValidationException,
  Creator,
  KnowledgeAsset,
  KnowledgeSnapshot,
  ProjectMemory,
  ScriptBlock,
  Project,
  ProjectWorkflowService,
} from "./index.js";

describe("Domain Exceptions", () => {
  it("should carry structured metadata in exceptions", () => {
    const error = new EntityNotFoundException("Project", "123", { extra: "info" });
    expect(error.message).toContain("Entity 'Project' with ID '123' was not found.");
    expect(error.code).toBe("ENTITY_NOT_FOUND");
    expect(error.statusCode).toBe(404);
    expect(error.metadata).toEqual({
      entityType: "Project",
      entityId: "123",
      extra: "info",
    });
  });

  it("should hold state transition info on InvalidStateTransitionException", () => {
    const error = new InvalidStateTransitionException("Project", "456", "draft", "review");
    expect(error.metadata).toEqual({
      entityType: "Project",
      entityId: "456",
      currentState: "draft",
      targetState: "review",
    });
  });
});

describe("Value Objects", () => {
  describe("Email", () => {
    it("should successfully construct valid email and normalize it", () => {
      const email = new Email("  Test@Rishi.AI  ");
      expect(email.getValue()).toBe("test@rishi.ai");
    });

    it("should throw ValidationException on invalid email format", () => {
      expect(() => new Email("invalid-email")).toThrow(ValidationException);
      expect(() => new Email("")).toThrow(ValidationException);
    });

    it("should correctly compare emails with equals()", () => {
      const e1 = new Email("test@rishi.ai");
      const e2 = new Email("TEST@rishi.ai");
      const e3 = new Email("other@rishi.ai");
      expect(e1.equals(e2)).toBe(true);
      expect(e1.equals(e3)).toBe(false);
    });
  });

  describe("SpeakingPacingInfo", () => {
    it("should construct and calculate pacing duration", () => {
      const pacing = new SpeakingPacingInfo(300, 150); // 300 words at 150 wpm
      expect(pacing.getDurationInSeconds()).toBe(120);
    });

    it("should throw ValidationException on invalid inputs", () => {
      expect(() => new SpeakingPacingInfo(-10, 150)).toThrow(ValidationException);
      expect(() => new SpeakingPacingInfo(100, 0)).toThrow(ValidationException);
    });

    it("should compare correctly", () => {
      const p1 = new SpeakingPacingInfo(100, 150);
      const p2 = new SpeakingPacingInfo(100, 150);
      const p3 = new SpeakingPacingInfo(120, 150);
      expect(p1.equals(p2)).toBe(true);
      expect(p1.equals(p3)).toBe(false);
    });
  });

  describe("ConfidenceScore", () => {
    it("should construct confidence scores between 0 and 100", () => {
      const score = new ConfidenceScore(85);
      expect(score.value).toBe(85);
    });

    it("should throw on invalid scores", () => {
      expect(() => new ConfidenceScore(-5)).toThrow(ValidationException);
      expect(() => new ConfidenceScore(105)).toThrow(ValidationException);
      expect(() => new ConfidenceScore(85.5)).toThrow(ValidationException);
    });
  });

  describe("SourceCoverage", () => {
    it("should construct coverage when total equals 100", () => {
      const coverage = new SourceCoverage({
        projectPercent: 40,
        personalPercent: 30,
        platformPercent: 20,
        publicPercent: 10,
      });
      expect(coverage.projectPercent).toBe(40);
    });

    it("should throw if total coverage does not sum to 100", () => {
      expect(
        () =>
          new SourceCoverage({
            projectPercent: 40,
            personalPercent: 30,
            platformPercent: 20,
            publicPercent: 20, // Sums to 110
          })
      ).toThrow(ValidationException);
    });
  });
});

describe("Creator Entity", () => {
  it("should transition status from active to suspended to active", () => {
    const creator = new Creator("c1", new Email("c1@rishi.ai"));
    expect(creator.status).toBe("active");

    creator.suspend();
    expect(creator.status).toBe("suspended");

    creator.activate();
    expect(creator.status).toBe("active");
  });

  it("should fail to transition status when deleted", () => {
    const creator = new Creator("c1", new Email("c1@rishi.ai"));
    creator.markAsDeleted();
    expect(creator.status).toBe("deleted");

    expect(() => creator.activate()).toThrow(InvalidStateTransitionException);
    expect(() => creator.suspend()).toThrow(InvalidStateTransitionException);
  });
});

describe("KnowledgeAsset Entity", () => {
  it("should update asset details and increment versionId", () => {
    const asset = new KnowledgeAsset("a1", "c1", "Title 1", "path/1");
    expect(asset.versionId).toBe(1);

    asset.updateAssetDetails("New Title", "path/2");
    expect(asset.title).toBe("New Title");
    expect(asset.storagePath).toBe("path/2");
    expect(asset.versionId).toBe(2);
  });

  it("should support soft-deletion and deprecation", () => {
    const asset = new KnowledgeAsset("a1", "c1", "Title 1", "path/1");
    asset.deprecate();
    expect(asset.status).toBe("deprecated");

    asset.delete();
    expect(asset.status).toBe("deleted");
    expect(asset.deletedAt!).toBeInstanceOf(Date);
  });
});

describe("KnowledgeSnapshot Entity (Deep Immutability)", () => {
  it("should deeply freeze snapshot fields on construction", () => {
    const snap = new KnowledgeSnapshot("s1", "p1", "a1", "Title 1", 1, "Frozen content");
    expect(Object.isFrozen(snap)).toBe(true);
    expect(() => {
      (snap as any).title = "Mutated Title";
    }).toThrow();
  });
});

describe("Project Aggregate Root (Workflow States & State Transitions)", () => {
  it("should initiate in draft state", () => {
    const project = new Project("p1", "c1", "Project Title");
    expect(project.state).toBe("draft");
    expect(project.hasStateDrift).toBe(false);
  });

  it("should step forward state sequentially", () => {
    const project = new Project("p1", "c1", "Project Title");
    project.transitionTo("research", "tx1");
    expect(project.state).toBe("research");
    expect(project.domainEvents.length).toBe(1);
    expect(project.domainEvents[0]!.eventType).toBe("project.state_transitioned");

    project.transitionTo("knowledge_organized", "tx2");
    expect(project.state).toBe("knowledge_organized");
  });

  it("should throw InvalidStateTransitionException on skipping sequential stages", () => {
    const project = new Project("p1", "c1", "Project Title");
    expect(() => project.transitionTo("outline_generated", "tx1")).toThrow(
      InvalidStateTransitionException
    );
  });

  it("should step backward state, set state drift, and emit backstep transitioned event", () => {
    const project = new Project("p1", "c1", "Project Title", "script_generated");
    project.transitionTo("knowledge_organized", "tx1");
    expect(project.state).toBe("knowledge_organized");
    expect(project.hasStateDrift).toBe(true);

    const event = project.domainEvents[0];
    expect(event!.payload).toEqual({
      oldState: "script_generated",
      newState: "knowledge_organized",
      isBackstep: true,
    });
  });

  it("should archive from any stage and restore exact prior state", () => {
    const project = new Project("p1", "c1", "Project Title", "working_context_generated");
    project.transitionTo("archived", "tx1");
    expect(project.state).toBe("archived");
    expect(project.previousState).toBe("working_context_generated");

    // Unarchive
    project.transitionTo("draft", "tx2"); // Triggering restore index behavior
    expect(project.state).toBe("working_context_generated");
  });

  it("should prevent aggregate child mutations when archived", () => {
    const project = new Project("p1", "c1", "Project Title", "archived");
    const block = new ScriptBlock("b1", "p1", 0, false, "Block 1", "");
    expect(() => project.addScriptBlock(block, "tx1")).toThrow(InvalidStateTransitionException);
  });

  it("should add, lock, unlock, update, and reorder script blocks", () => {
    const project = new Project("p1", "c1", "Project Title", "outline_generated");
    const b1 = new ScriptBlock("b1", "p1", 0, false, "Chapter 1", "Draft content 1");
    const b2 = new ScriptBlock("b2", "p1", 1, false, "Chapter 2", "Draft content 2");

    project.addScriptBlock(b1, "tx1");
    project.addScriptBlock(b2, "tx2");
    expect(project.scriptBlocks.length).toBe(2);

    // Lock block
    project.lockScriptBlock("b1", "tx3");
    expect(b1.isLocked).toBe(true);
    expect(b1.status).toBe("locked");

    // Attempting update on locked block throws
    expect(() => project.updateScriptBlockContent("b1", "User edits...", "tx4")).toThrow(
      ValidationException
    );

    // Unlock and update
    project.unlockScriptBlock("b1", "tx5");
    project.updateScriptBlockContent("b1", "User edits...", "tx6");
    expect(b1.content).toBe("User edits...");
    expect(project.hasStateDrift).toBe(true); // Drift flagged on script contents update

    // Reorder blocks
    project.reorderScriptBlocks(["b2", "b1"], "tx7");
    expect(project.scriptBlocks[0]!.id).toBe("b2");
    expect(project.scriptBlocks[0]!.sortOrder).toBe(0);
    expect(project.scriptBlocks[1]!.id).toBe("b1");
    expect(project.scriptBlocks[1]!.sortOrder).toBe(1);
  });
});

describe("ProjectWorkflowService (Domain Service)", () => {
  const service = new ProjectWorkflowService();

  it("should sequentially compile working context representation", () => {
    const project = new Project("p1", "c1", "Vedic Epics");
    const snapshot = new KnowledgeSnapshot(
      "s1",
      "p1",
      "a1",
      "Ramayana Summary",
      1,
      "Valmiki text details"
    );
    const memory = new ProjectMemory("m1", "p1", "outline_finalized", {
      outline: ["intro", "climax"],
    });

    const contextText = service.compileWorkingContext(project, [memory], [snapshot]);

    expect(contextText).toContain("=== PROJECT WORKING CONTEXT: Vedic Epics ===");
    expect(contextText).toContain("Valmiki text details");
    expect(contextText).toContain("outline_finalized");
  });

  it("should flag context drift when current asset version exceeds snapshot version", () => {
    const project = new Project("p1", "c1", "Vedic Epics");
    const snapshot = new KnowledgeSnapshot(
      "s1",
      "p1",
      "a1",
      "Ramayana Summary",
      1,
      "Valmiki text details"
    );
    project.hydrateSnapshots([snapshot]);

    const activeAssetVersions = new Map<string, number>();
    activeAssetVersions.set("a1", 2); // Version drifted to 2

    const driftDetected = service.detectContextDrift(project, activeAssetVersions, "tx1");
    expect(driftDetected).toBe(true);
    expect(project.domainEvents.length).toBe(1);
    expect(project.domainEvents[0]!.eventType).toBe("project.context_drift_detected");
  });

  it("should not flag drift when asset versions match", () => {
    const project = new Project("p1", "c1", "Vedic Epics");
    const snapshot = new KnowledgeSnapshot(
      "s1",
      "p1",
      "a1",
      "Ramayana Summary",
      1,
      "Valmiki text details"
    );
    project.hydrateSnapshots([snapshot]);

    const activeAssetVersions = new Map<string, number>();
    activeAssetVersions.set("a1", 1); // Versions match

    const driftDetected = service.detectContextDrift(project, activeAssetVersions, "tx1");
    expect(driftDetected).toBe(false);
  });
});
