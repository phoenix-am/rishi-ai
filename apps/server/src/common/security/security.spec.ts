import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";

// Mock NestJS createParamDecorator to expose the callback for unit testing
vi.mock("@nestjs/common", async (importOriginal) => {
  const original = (await importOriginal()) as any;
  return {
    ...original,
    createParamDecorator: (factory: any) => {
      const decorator = original.createParamDecorator(factory);
      (decorator as any).factory = factory; // attach callback for testing
      return decorator;
    },
  };
});

import { JwtAuthGuard } from "./jwt-auth.guard.js";
import { WorkspaceGuard } from "./workspace.guard.js";
import { CurrentUser } from "./current-user.decorator.js";
import { CurrentWorkspace } from "./current-workspace.decorator.js";
import { JwtTokenService } from "../../modules/auth/services/jwt-token.service.js";
import { generateKeyPairSync } from "node:crypto";

describe("Security Guards and Decorators", () => {
  const keys = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  describe("JwtAuthGuard", () => {
    let guard: JwtAuthGuard;
    let mockReflector: any;
    let mockConfigService: any;

    beforeEach(() => {
      mockReflector = {
        getAllAndOverride: vi.fn(),
      };
      mockConfigService = {
        get: vi.fn((key: string) => (key === "JWT_PRIVATE_KEY" ? keys.privateKey : keys.publicKey)),
      };
      guard = new JwtAuthGuard(mockReflector, mockConfigService);
    });

    it("should allow request immediately if decorated with @Public", async () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);
      const mockContext = createMockContext({ headers: {} }, "/any-path");

      const result = await guard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it("should throw UnauthorizedException if authorization header is missing", async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const mockContext = createMockContext({ headers: {} }, "/protected");

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
    });

    it("should successfully authenticate with a valid RS256 token", async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const token = await new JwtTokenService(mockConfigService).signToken({
        sub: "user-123",
        email: "user@rishi.ai",
        role: "admin",
      });

      const mockRequest = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      };
      const mockContext = createMockContext(mockRequest, "/protected");

      const result = await guard.canActivate(mockContext);
      expect(result).toBe(true);

      const requestObj = mockContext.switchToHttp().getRequest();
      expect(requestObj.user).toEqual({
        id: "user-123",
        email: "user@rishi.ai",
        role: "admin",
      });
    });

    it("should throw UnauthorizedException if token is invalid or expired", async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const mockRequest = {
        headers: {
          authorization: "Bearer invalid-token",
        },
      };
      const mockContext = createMockContext(mockRequest, "/protected");

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("WorkspaceGuard", () => {
    let guard: WorkspaceGuard;
    let mockReflector: any;
    let mockDbService: any;
    let mockDrizzleClient: any;

    beforeEach(() => {
      mockReflector = {
        getAllAndOverride: vi.fn(),
      };
      const selectMock = vi.fn();
      mockDrizzleClient = {
        select: selectMock,
      };
      mockDbService = {
        get client() {
          return mockDrizzleClient;
        },
      };
      guard = new WorkspaceGuard(mockReflector, mockDbService);
    });

    it("should bypass guard if decorated with @Public", async () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);
      const mockContext = createMockContext({ headers: {} }, "/public");

      const result = await guard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it("should throw UnauthorizedException if request.user is missing", async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const mockContext = createMockContext({ headers: {} }, "/workspace"); // no request.user injected

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
    });

    it("should throw BadRequestException if workspace ID is missing from headers, query, or path parameters", async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const mockRequest = {
        user: { id: "user-1" },
        headers: {},
        query: {},
        params: {},
      };
      const mockContext = createMockContext(mockRequest, "/workspace");

      await expect(guard.canActivate(mockContext)).rejects.toThrow(BadRequestException);
    });

    it("should allow request if user has workspace membership", async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const mockRequest = {
        user: { id: "user-1" },
        headers: {
          "x-workspace-id": "ws-123",
        },
      };
      const mockContext = createMockContext(mockRequest, "/workspace");

      // Setup Drizzle select mock for member query
      const selectBuilder = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi
          .fn()
          .mockResolvedValue([{ workspaceId: "ws-123", name: "My Workspace", role: "owner" }]),
      };
      mockDrizzleClient.select.mockReturnValue(selectBuilder);

      const result = await guard.canActivate(mockContext);
      expect(result).toBe(true);

      const reqObj = mockContext.switchToHttp().getRequest();
      expect(reqObj.workspace).toEqual({
        id: "ws-123",
        name: "My Workspace",
        role: "owner",
      });
    });

    it("should throw ForbiddenException if user has no membership", async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const mockRequest = {
        user: { id: "user-1" },
        headers: {},
        query: {
          workspaceId: "ws-forbidden",
        },
      };
      const mockContext = createMockContext(mockRequest, "/workspace");

      const selectBuilder = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]), // no membership
      };
      mockDrizzleClient.select.mockReturnValue(selectBuilder);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
    });
  });

  describe("Decorators", () => {
    it("CurrentUser decorator should extract user from request", () => {
      // Find parameter decorator function binding
      // (Custom parameter decorator requires invoking factory function returned by creator)
      const decoratorFactory = getCurrentUserDecoratorFactory();
      const mockReq = { user: { id: "user-1" } };
      const mockContext = createMockContext(mockReq, "/");

      const user = decoratorFactory(null, mockContext);
      expect(user).toEqual({ id: "user-1" });
    });

    it("CurrentWorkspace decorator should extract workspace from request", () => {
      const decoratorFactory = getCurrentWorkspaceDecoratorFactory();
      const mockReq = { workspace: { id: "ws-1", role: "admin" } };
      const mockContext = createMockContext(mockReq, "/");

      const workspace = decoratorFactory(null, mockContext);
      expect(workspace).toEqual({ id: "ws-1", role: "admin" });
    });
  });

  // --- Helper Helpers ---

  function createMockContext(requestPayload: any, path?: string): ExecutionContext {
    void path;
    return {
      switchToHttp: () => ({
        getRequest: () => requestPayload,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  }

  function getCurrentUserDecoratorFactory() {
    return (CurrentUser as any).factory;
  }

  function getCurrentWorkspaceDecoratorFactory() {
    return (CurrentWorkspace as any).factory;
  }
});
