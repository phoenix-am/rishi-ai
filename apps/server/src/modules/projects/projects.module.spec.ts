import { describe, expect, it } from "vitest";
import * as publicApi from "./index.js";
import { ProjectsModule } from "./projects.module.js";
import { ProjectsApplicationService } from "./services/projects-application.service.js";

describe("ProjectsModule public API", () => {
  it("exports the approved Project Workspace boundary", () => {
    expect(publicApi.ProjectsModule).toBe(ProjectsModule);
    expect(publicApi.ProjectsApplicationService).toBe(ProjectsApplicationService);
    expect(publicApi.PROJECT_STATES).toHaveLength(9);
    expect(publicApi.OptimisticLockException).toBeDefined();
  });
});
