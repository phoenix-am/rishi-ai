import { BadRequestException, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { ResourceOwnershipGuard } from "./resource-ownership.guard.js";

describe("ResourceOwnershipGuard", () => {
  it("allows routes that do not declare a resource requirement", async () => {
    const { guard, reflector, authorization } = createGuard();
    reflector.getAllAndOverride.mockReturnValue(undefined);

    await expect(guard.canActivate(createContext({}))).resolves.toBe(true);
    expect(authorization.assertWorkspaceResource).not.toHaveBeenCalled();
  });

  it("rejects a missing authenticated user", async () => {
    const { guard, reflector } = createGuard();
    reflector.getAllAndOverride.mockReturnValue({ type: "project", param: "id" });

    await expect(
      guard.canActivate(createContext({ workspace: { id: "workspace-1" }, params: { id: "p-1" } }))
    ).rejects.toThrow(UnauthorizedException);
  });

  it("rejects a missing workspace membership context", async () => {
    const { guard, reflector } = createGuard();
    reflector.getAllAndOverride.mockReturnValue({ type: "project", param: "id" });

    await expect(
      guard.canActivate(createContext({ user: { id: "user-1" }, params: { id: "p-1" } }))
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects a missing declared route parameter", async () => {
    const { guard, reflector } = createGuard();
    reflector.getAllAndOverride.mockReturnValue({ type: "project", param: "projectId" });

    await expect(
      guard.canActivate(
        createContext({
          user: { id: "user-1" },
          workspace: { id: "workspace-1" },
          params: {},
        })
      )
    ).rejects.toThrow(BadRequestException);
  });

  it("delegates the declared resource check using the active workspace", async () => {
    const { guard, reflector, authorization } = createGuard();
    reflector.getAllAndOverride.mockReturnValue({ type: "workflow-run", param: "runId" });

    await expect(
      guard.canActivate(
        createContext({
          user: { id: "user-1" },
          workspace: { id: "workspace-1" },
          params: { runId: "run-1" },
        })
      )
    ).resolves.toBe(true);
    expect(authorization.assertWorkspaceResource).toHaveBeenCalledWith(
      "workspace-1",
      "workflow-run",
      "run-1"
    );
  });
});

function createGuard() {
  const reflector = { getAllAndOverride: vi.fn() };
  const authorization = { assertWorkspaceResource: vi.fn().mockResolvedValue(undefined) };
  return {
    guard: new ResourceOwnershipGuard(reflector as never, authorization as never),
    reflector,
    authorization,
  };
}

function createContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as ExecutionContext;
}
