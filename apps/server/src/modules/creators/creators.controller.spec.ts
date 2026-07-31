import "reflect-metadata";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateKeyPairSync } from "crypto";
import { Test, TestingModule } from "@nestjs/testing";
import { NestFastifyApplication, FastifyAdapter } from "@nestjs/platform-fastify";
import { CreatorsModule } from "./creators.module.js";
import { DatabaseModule } from "../../foundation/database/database.module.js";
import { ConfigService } from "@rishi/config";
import { DatabaseService } from "@rishi/database";
import { CreatorsApplicationService } from "./services/creators-application.service.js";
import { bootstrapSecurity } from "../../foundation/bootstrap/bootstrap-security.js";
import { bootstrapVersioning } from "../../foundation/bootstrap/bootstrap-versioning.js";
import { ForbiddenException, ValidationPipe } from "@nestjs/common";
import { ResponseEnvelopeInterceptor } from "../../foundation/interceptors/response.interceptor.js";
import jwt from "jsonwebtoken";
import { AuthorizationService } from "../../common/security/authorization.service.js";

describe("CreatorsController E2E / Integration", () => {
  let app: NestFastifyApplication;
  let mockDrizzleClient: any;
  let mockConfigService: any;
  let mockCreatorsService: any;
  let mockAuthorizationService: any;

  // Generate valid RS256 key pair on the fly for test signature validation
  const { privateKey: testPrivateKey, publicKey: testPublicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  const testToken = jwt.sign(
    { sub: "user-123", email: "test@rishi.ai", role: "user" },
    testPrivateKey,
    { algorithm: "RS256", expiresIn: "1h" }
  );

  beforeEach(async () => {
    mockConfigService = new ConfigService({
      NODE_ENV: "test",
      PORT: "3002",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/rishi_test",
      AES_MASTER_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      LOG_LEVEL: "error",
      JWT_PRIVATE_KEY: testPrivateKey,
      JWT_PUBLIC_KEY: testPublicKey,
    });

    const selectMock = vi.fn();
    const updateMock = vi.fn();
    const insertMock = vi.fn();

    mockDrizzleClient = {
      transaction: vi.fn((cb) => cb(mockDrizzleClient)),
      select: selectMock,
      update: updateMock,
      insert: insertMock,
    };

    // Mock select builder for WorkspaceGuard
    const selectBuilder: any = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockImplementation(() => {
        return {
          then: (resolve: any) => {
            resolve([{ workspaceId: "w-123", name: "Test Workspace", role: "owner" }]);
          },
        };
      }),
    };
    selectMock.mockReturnValue(selectBuilder);

    mockCreatorsService = {
      create: vi.fn(),
      update: vi.fn(),
      getById: vi.fn(),
      list: vi.fn(),
    };
    mockAuthorizationService = {
      assertWorkspaceResource: vi.fn().mockResolvedValue(undefined),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CreatorsModule, DatabaseModule],
    })
      .overrideProvider(ConfigService)
      .useValue(mockConfigService)
      .overrideProvider("DRIZZLE_CLIENT")
      .useValue({ pool: {}, db: mockDrizzleClient })
      .overrideProvider(CreatorsApplicationService)
      .useValue(mockCreatorsService)
      .overrideProvider(AuthorizationService)
      .useValue(mockAuthorizationService)
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
    await bootstrapSecurity(app);
    bootstrapVersioning(app);

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(async () => {
    try {
      const dbService = app.get(DatabaseService);
      await dbService.close();
    } catch {
      // Ignore error
    }
    await app.close();
  });

  describe("POST /api/v1/creators", () => {
    it("should create a creator successfully", async () => {
      const mockResult = {
        id: "creator-uuid",
        workspaceId: "w-123",
        name: "John Doe",
        handle: "john_doe",
        bio: null,
        avatarUrl: null,
        createdAt: new Date().toISOString(),
      };
      mockCreatorsService.create.mockResolvedValue(mockResult);

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/creators",
        headers: {
          authorization: `Bearer ${testToken}`,
          "x-workspace-id": "w-123",
        },
        payload: {
          name: "John Doe",
          handle: "john_doe",
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe("creator-uuid");
      expect(body.data.handle).toBe("john_doe");
    });

    it("should fail validation with invalid handle", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/creators",
        headers: {
          authorization: `Bearer ${testToken}`,
          "x-workspace-id": "w-123",
        },
        payload: {
          name: "John Doe",
          handle: "invalid handle!",
        },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe("GET /api/v1/creators/:id", () => {
    it("should return the matching creator profile", async () => {
      const mockResult = {
        id: "d3b07384-d113-4ec6-a5d7-ecf97e2893d5",
        workspaceId: "w-123",
        name: "John Doe",
        handle: "john_doe",
        bio: null,
        avatarUrl: null,
        createdAt: new Date().toISOString(),
      };
      mockCreatorsService.getById.mockResolvedValue(mockResult);

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/creators/d3b07384-d113-4ec6-a5d7-ecf97e2893d5",
        headers: {
          authorization: `Bearer ${testToken}`,
          "x-workspace-id": "w-123",
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe("d3b07384-d113-4ec6-a5d7-ecf97e2893d5");
    });

    it("should reject a creator outside the active workspace before the controller runs", async () => {
      mockAuthorizationService.assertWorkspaceResource.mockRejectedValueOnce(
        new ForbiddenException("Access Denied")
      );

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/creators/d3b07384-d113-4ec6-a5d7-ecf97e2893d5",
        headers: {
          authorization: `Bearer ${testToken}`,
          "x-workspace-id": "w-123",
        },
      });

      expect(res.statusCode).toBe(403);
      expect(mockCreatorsService.getById).not.toHaveBeenCalled();
    });
  });
});
