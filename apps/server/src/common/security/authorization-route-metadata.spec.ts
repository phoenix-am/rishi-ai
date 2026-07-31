import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { CreatorsController } from "../../modules/creators/creators.controller.js";
import { ProjectsController } from "../../modules/projects/projects.controller.js";
import { ContentAssetsController } from "../../modules/content-assets/content-assets.controller.js";
import { WorkflowsController } from "../../modules/workflows/workflows.controller.js";
import {
  AUTHORIZATION_RESOURCE_KEY,
  type AuthorizationResourceRequirement,
} from "./authorization-resource.decorator.js";

describe("authorization route metadata", () => {
  it.each([
    [CreatorsController, "getById", { type: "creator", param: "id" }],
    [CreatorsController, "update", { type: "creator", param: "id" }],
    [ProjectsController, "getById", { type: "project", param: "id" }],
    [ProjectsController, "update", { type: "project", param: "id" }],
    [ContentAssetsController, "getById", { type: "content-asset", param: "id" }],
    [ContentAssetsController, "update", { type: "content-asset", param: "id" }],
    [ContentAssetsController, "listByProjectId", { type: "project", param: "projectId" }],
    [WorkflowsController, "getById", { type: "workflow", param: "id" }],
    [WorkflowsController, "update", { type: "workflow", param: "id" }],
    [WorkflowsController, "delete", { type: "workflow", param: "id" }],
    [WorkflowsController, "triggerRun", { type: "workflow", param: "id" }],
    [WorkflowsController, "getRun", { type: "workflow-run", param: "runId" }],
    [WorkflowsController, "stream", { type: "workflow-run", param: "runId" }],
  ] as const)("marks %s.%s with its ownership requirement", (controller, method, expected) => {
    const prototype = controller.prototype as unknown as Record<string, object>;
    const handler = prototype[method];
    expect(handler).toBeDefined();
    const requirement = Reflect.getMetadata(
      AUTHORIZATION_RESOURCE_KEY,
      handler!
    ) as AuthorizationResourceRequirement;

    expect(requirement).toEqual(expected);
  });
});
