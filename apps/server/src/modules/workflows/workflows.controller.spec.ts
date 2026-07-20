import "reflect-metadata";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateKeyPairSync } from "crypto";
import { Test, TestingModule } from "@nestjs/testing";
import { NestFastifyApplication, FastifyAdapter } from "@nestjs/platform-fastify";
import { WorkflowsModule } from "./workflows.module.js";
import { DatabaseModule } from "../../foundation/database/database.module.js";
import { ConfigService } from "@rishi/config";
import { DatabaseService } from "@rishi/database";
import { WorkflowsService } from "./services/workflows.service.js";
import { bootstrapSecurity } from "../../foundation/bootstrap/bootstrap-security.js";
import { bootstrapVersioning } from "../../foundation/bootstrap/bootstrap-versioning.js";
import { ValidationPipe } from "@nestjs/common";
import { ResponseEnvelopeInterceptor } from "../../foundation/interceptors/response.interceptor.js";
import jwt from "jsonwebtoken";

describe("WorkflowsController E2E / Integration", () => {
  let app: NestFastifyApplication;
  let mockDrizzleClient: any;
  let mockConfigService: any;
  let mockWorkflowsService: any;

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
    mockDrizzleClient = {
      transaction: vi.fn((cb) => cb(mockDrizzleClient)),
      select: selectMock,
    };

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

    mockWorkflowsService = {
      create: vi.fn(),
      update: vi.fn(),
      getById: vi.fn(),
      list: vi.fn(),
      delete: vi.fn(),
      createRun: vi.fn(),
      getRun: vi.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [WorkflowsModule, DatabaseModule],
    })
      .overrideProvider(ConfigService)
      .useValue(mockConfigService)
      .overrideProvider("DRIZZLE_CLIENT")
      .useValue({ pool: {}, db: mockDrizzleClient })
      .overrideProvider(WorkflowsService)
      .useValue(mockWorkflowsService)
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
      // ignore
    }
    await app.close();
  });

  describe("POST /api/v1/workflows", () => {
    it("should create a workflow successfully", async () => {
      const mockResult = {
        id: "d3b07384-d113-4ec6-a5d7-ecf97e2893d5",
        workspaceId: "w-123",
        name: "Test Pipeline",
        description: "Desc",
        triggerType: "manual",
        definition: { nodes: [], edges: [] },
        status: "draft",
        createdAt: new Date().toISOString(),
      };
      mockWorkflowsService.create.mockResolvedValue(mockResult);

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/workflows",
        headers: {
          authorization: `Bearer ${testToken}`,
          "x-workspace-id": "w-123",
        },
        payload: {
          name: "Test Pipeline",
          description: "Desc",
          triggerType: "manual",
          definition: { nodes: [], edges: [] },
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe("d3b07384-d113-4ec6-a5d7-ecf97e2893d5");
      expect(body.data.name).toBe("Test Pipeline");
    });

    it("should fail validation with invalid definition (missing nodes)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/workflows",
        headers: {
          authorization: `Bearer ${testToken}`,
          "x-workspace-id": "w-123",
        },
        payload: {
          name: "Test Pipeline",
          triggerType: "manual",
          definition: { edges: [] }, // missing nodes
        },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe("GET /api/v1/workflows/:id", () => {
    it("should retrieve workflow by ID", async () => {
      const mockResult = {
        id: "d3b07384-d113-4ec6-a5d7-ecf97e2893d5",
        workspaceId: "w-123",
        name: "Test Pipeline",
        description: "Desc",
        triggerType: "manual",
        definition: { nodes: [], edges: [] },
        status: "draft",
        createdAt: new Date().toISOString(),
      };
      mockWorkflowsService.getById.mockResolvedValue(mockResult);

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/workflows/d3b07384-d113-4ec6-a5d7-ecf97e2893d5",
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
  });

  describe("POST /api/v1/workflows/:id/runs", () => {
    it("should trigger a workflow run", async () => {
      const mockRun = {
        id: "e4b07384-d113-4ec6-a5d7-ecf97e2893d6",
        workflowId: "d3b07384-d113-4ec6-a5d7-ecf97e2893d5",
        workspaceId: "w-123",
        projectId: "p-456",
        status: "PENDING",
        state: { inputs: { topic: "history" }, outputs: {} },
        startedAt: new Date().toISOString(),
        completedAt: null,
      };
      mockWorkflowsService.createRun.mockResolvedValue(mockRun);

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/workflows/d3b07384-d113-4ec6-a5d7-ecf97e2893d5/runs",
        headers: {
          authorization: `Bearer ${testToken}`,
          "x-workspace-id": "w-123",
        },
        payload: {
          inputs: {
            topic: "history",
          },
          projectId: "a1b2c3d4-e5f6-4890-abcd-ef1234567890",
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe("e4b07384-d113-4ec6-a5d7-ecf97e2893d6");
      expect(body.data.status).toBe("PENDING");
    });
  });
});
