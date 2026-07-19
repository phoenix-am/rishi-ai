import { Test } from "@nestjs/testing";
import { AppModule } from "./app.module.js";
import { ConfigService } from "@rishi/config";
import { TransactionManager } from "@rishi/transaction";
import { DatabaseService } from "@rishi/database";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import {
  ProjectWorkflowService,
  CREATOR_REPOSITORY,
  PROJECT_REPOSITORY,
  KNOWLEDGE_ASSET_REPOSITORY,
  KNOWLEDGE_SNAPSHOT_REPOSITORY,
  SCRIPT_BLOCK_REPOSITORY,
  PROJECT_MEMORY_REPOSITORY,
} from "@rishi/domain";
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { generateKeyPairSync } from "crypto";

describe("AppModule Bootstrap", () => {
  beforeAll(() => {
    // Generate valid RS256 key pair on the fly for env configuration validation
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    // Inject required env variables for Zod validation check
    process.env.NODE_ENV = "test";
    process.env.PORT = "3000";
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/rishi_ai";
    process.env.PRIMARY_AI_PROVIDER = "gemini";
    process.env.AES_MASTER_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    process.env.JWT_PRIVATE_KEY = privateKey;
    process.env.JWT_PUBLIC_KEY = publicKey;
  });

  let appsToClose: NestFastifyApplication[] = [];
  let modulesToClose: any[] = [];

  afterEach(async () => {
    for (const app of appsToClose) {
      try {
        const dbService = app.get(DatabaseService);
        await dbService.close();
      } catch {
        // Ignore error
      }
      try {
        await app.close();
      } catch {
        // Ignore error
      }
    }
    appsToClose = [];

    for (const moduleRef of modulesToClose) {
      try {
        const dbService = moduleRef.get(DatabaseService);
        await dbService.close();
      } catch {
        // Ignore error
      }
      try {
        await moduleRef.close();
      } catch {
        // Ignore error
      }
    }
    modulesToClose = [];
  });

  it("should compile NestJS AppModule cleanly and resolve singleton providers", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    modulesToClose.push(moduleRef);

    // 1. Config Service
    const config = moduleRef.get<ConfigService>(ConfigService);
    expect(config).toBeDefined();
    expect(config.get("NODE_ENV")).toBe("test");

    // 2. Logger Service
    const logger = moduleRef.get("ILogger");
    expect(logger).toBeDefined();

    // 3. Transaction Manager
    const txManager = moduleRef.get(TransactionManager);
    expect(txManager).toBeDefined();
    const txManager2 = moduleRef.get(TransactionManager);
    expect(txManager).toBe(txManager2); // Verify singleton lifetime

    // 4. Database Service
    const dbService = moduleRef.get(DatabaseService);
    expect(dbService).toBeDefined();
    const dbService2 = moduleRef.get(DatabaseService);
    expect(dbService).toBe(dbService2); // Verify singleton lifetime

    // 5. Repositories (Verify Dependency Inversion Symbol tokens resolve correctly)
    expect(moduleRef.get(CREATOR_REPOSITORY)).toBeDefined();
    expect(moduleRef.get(PROJECT_REPOSITORY)).toBeDefined();
    expect(moduleRef.get(KNOWLEDGE_ASSET_REPOSITORY)).toBeDefined();
    expect(moduleRef.get(KNOWLEDGE_SNAPSHOT_REPOSITORY)).toBeDefined();
    expect(moduleRef.get(SCRIPT_BLOCK_REPOSITORY)).toBeDefined();
    expect(moduleRef.get(PROJECT_MEMORY_REPOSITORY)).toBeDefined();

    // 6. Domain Services
    expect(moduleRef.get(ProjectWorkflowService)).toBeDefined();
  });

  it("should successfully boot application context when database ping succeeds", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    modulesToClose.push(moduleRef);

    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    appsToClose.push(app);
    const dbService = app.get(DatabaseService);

    // Mock successful database ping
    const pingSpy = vi.spyOn(dbService, "ping").mockResolvedValue(true);

    await expect(app.init()).resolves.not.toThrow();
    expect(pingSpy).toHaveBeenCalledTimes(1);
  });

  it("should fail fast and throw initialization error when database connection is dead during startup", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    modulesToClose.push(moduleRef);

    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    appsToClose.push(app);
    const dbService = app.get(DatabaseService);

    // Mock failed database ping
    const pingSpy = vi.spyOn(dbService, "ping").mockResolvedValue(false);

    await expect(app.init()).rejects.toThrow(
      "Database startup check failed. Verify connection settings and availability."
    );
    expect(pingSpy).toHaveBeenCalledTimes(1);
  });
});
