import { describe, expect, it, vi } from "vitest";
import { ProjectsController } from "./projects.controller.js";

describe("ProjectsController workspace commands", () => {
  it("routes lifecycle and snapshot commands through the application service", async () => {
    const service = {
      transitionProjectState: vi.fn(async () => ({ id: "project-1", status: "research" })),
      attachSnapshot: vi.fn(async () => ({ id: "snapshot-1" })),
      listSnapshots: vi.fn(async () => [{ id: "snapshot-1" }]),
      detachSnapshot: vi.fn(),
    };
    const controller = new ProjectsController(service as never);
    const workspace = { id: "workspace-1" };

    await expect(
      controller.transitionState(workspace, "project-1", {
        targetState: "research",
        expectedVersion: 1,
      })
    ).resolves.toMatchObject({ status: "research" });
    await expect(
      controller.attachSnapshot(workspace, "project-1", { assetId: "asset-1" })
    ).resolves.toMatchObject({ id: "snapshot-1" });
    await expect(controller.listSnapshots(workspace, "project-1")).resolves.toHaveLength(1);
    await expect(
      controller.detachSnapshot(workspace, "project-1", "snapshot-1")
    ).resolves.toBeUndefined();

    expect(service.transitionProjectState).toHaveBeenCalledWith("workspace-1", "project-1", {
      targetState: "research",
      expectedVersion: 1,
    });
    expect(service.attachSnapshot).toHaveBeenCalledWith("workspace-1", "project-1", "asset-1");
    expect(service.detachSnapshot).toHaveBeenCalledWith("workspace-1", "project-1", "snapshot-1");
  });
});
