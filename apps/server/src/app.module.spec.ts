import { Test } from "@nestjs/testing";
import { AppModule } from "./app.module.js";
import { ConfigService } from "@rishi/config";
import { describe, it, expect, beforeAll } from "vitest";

describe("AppModule Bootstrap", () => {
  beforeAll(() => {
    // Inject required env variables for Zod validation check
    process.env.NODE_ENV = "test";
    process.env.PORT = "3000";
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/rishi_ai";
    process.env.PRIMARY_AI_PROVIDER = "gemini";
    process.env.AES_MASTER_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  it("should compile NestJS AppModule cleanly", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const config = moduleRef.get<ConfigService>(ConfigService);
    expect(config).toBeDefined();
    expect(config.get("NODE_ENV")).toBe("test");
  });
});
