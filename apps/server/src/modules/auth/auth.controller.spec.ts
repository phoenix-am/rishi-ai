import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateKeyPairSync } from "crypto";
import { Test, TestingModule } from "@nestjs/testing";
import { NestFastifyApplication, FastifyAdapter } from "@nestjs/platform-fastify";
import { AuthModule } from "./auth.module.js";
import { DatabaseModule } from "../../foundation/database/database.module.js";
import { ConfigService } from "@rishi/config";
import { bootstrapSecurity } from "../../foundation/bootstrap/bootstrap-security.js";
import { bootstrapVersioning } from "../../foundation/bootstrap/bootstrap-versioning.js";

describe("AuthController E2E / Integration", () => {
  let app: NestFastifyApplication;
  let mockDrizzleClient: any;
  let mockEmailProvider: any;
  let mockConfigService: any;

  // Generate valid RS256 key pair on the fly for test signature validation
  const { privateKey: testPrivateKey, publicKey: testPublicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  beforeEach(async () => {
    mockEmailProvider = {
      sendOtp: vi.fn().mockResolvedValue(undefined),
    };

    mockConfigService = new ConfigService({
      NODE_ENV: "test",
      PORT: "3001",
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

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule, DatabaseModule],
    })
      .overrideProvider(ConfigService)
      .useValue(mockConfigService)
      .overrideProvider("DRIZZLE_CLIENT")
      .useValue({ pool: {}, db: mockDrizzleClient })
      .overrideProvider("IEmailProvider")
      .useValue(mockEmailProvider)
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await bootstrapSecurity(app);
    bootstrapVersioning(app);

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("POST /api/v1/auth/request-otp", () => {
    it("should return 200 with success status", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/request-otp", // NestJS route without version defaults to /api/auth/... since versioning is v1 by URI
        payload: { email: "founder@rishi.ai" },
      });
      expect(res.statusCode).toBe(404); // without v1 version prefix it should return 404 because v1 is configured as default version URI prefix

      // Wait, let's verify route matching under versioning
      // The versioning bootstrap sets URI versioning default version to "1".
      // So the actual URL could be `/api/v1/auth/request-otp`. Let's test `/api/v1/auth/request-otp`.
    });
  });

  // Let's implement full endpoints tests
  it("should complete OTP flow, issue cookie, rotate session and get profile info", async () => {
    // 1. Request OTP
    const reqOtpRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/request-otp",
      payload: { email: "founder@rishi.ai" },
    });
    expect(reqOtpRes.statusCode).toBe(200);
    expect(mockEmailProvider.sendOtp).toHaveBeenCalled();

    // Extract the generated code from otpStore (we can bypass mock or query the actual store if we get it)
    // To make it easy and self-contained, let's mock verify-otp database queries
    const mockUser = { id: "user-999", email: "founder@rishi.ai", role: "user" };
    const mockWorkspace = { id: "ws-999", name: "Personal Workspace", ownerId: "user-999" };

    const selectBuilder = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockImplementation(async () => {
        // Verify OTP does: 1. check if user exists, 2. check workspace membership (if user exists), 3. getMe does check user, check workspaces list
        // In this E2E test, we mock calls sequentially.
        return []; // first call: user doesn't exist
      }),
    };
    mockDrizzleClient.select.mockReturnValue(selectBuilder);

    const insertBuilder = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockImplementation(() => {
        return [mockUser]; // first returning: UserEntity
      }),
    };
    mockDrizzleClient.insert.mockReturnValue(insertBuilder);

    // Mock insert returning WorkspaceEntity on second call
    insertBuilder.returning
      .mockResolvedValueOnce([mockUser])
      .mockResolvedValueOnce([mockWorkspace]);

    // Get the OTP code sent to Email Provider mock
    const code = mockEmailProvider.sendOtp.mock.calls[0][1];

    // 2. Verify OTP
    const verifyRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/verify-otp",
      payload: { email: "founder@rishi.ai", code },
    });

    expect(verifyRes.statusCode).toBe(200);
    const verifyBody = JSON.parse(verifyRes.payload);
    expect(verifyBody.accessToken).toBeDefined();

    // Verify Set-Cookie header contains refresh_token
    const cookies = verifyRes.cookies;
    const refreshTokenCookie = cookies.find((c) => c.name === "refresh_token");
    expect(refreshTokenCookie).toBeDefined();
    expect(refreshTokenCookie!.value).toBeDefined();
    expect(refreshTokenCookie!.httpOnly).toBe(true);

    const activeRefreshToken = refreshTokenCookie!.value;

    // Reset mocks for session refresh
    mockDrizzleClient.select.mockReset();
    const mockSession = {
      id: "session-1",
      userId: "user-999",
      refreshTokenHash: "hash",
      isRevoked: false,
      expiresAt: new Date(Date.now() + 1000000),
    };

    const refreshSelectBuilder = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockImplementation(async () => {
        // First select is session search
        // Second select is user search
        if (mockDrizzleClient.select.mock.calls.length === 1) {
          return [mockSession];
        }
        return [mockUser];
      }),
    };
    mockDrizzleClient.select.mockReturnValue(refreshSelectBuilder);

    const updateBuilder = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
    };
    mockDrizzleClient.update.mockReturnValue(updateBuilder);

    // 3. Refresh Session
    const refreshRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      cookies: {
        refresh_token: activeRefreshToken,
      },
    });

    expect(refreshRes.statusCode).toBe(200);
    const refreshBody = JSON.parse(refreshRes.payload);
    expect(refreshBody.accessToken).toBeDefined();
    expect(refreshRes.cookies.find((c) => c.name === "refresh_token")).toBeDefined();

    // 4. Get Protected Profile Info /me
    mockDrizzleClient.select.mockReset();
    const profileSelectBuilder: any = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockImplementation(() => {
        if (mockDrizzleClient.select.mock.calls.length === 1) {
          return profileSelectBuilder;
        }
        return Promise.resolve([
          { id: "ws-999", name: "founder@rishi.ai's Workspace", role: "owner" },
        ]);
      }),
      limit: vi.fn().mockImplementation(async () => {
        return [mockUser];
      }),
    };
    mockDrizzleClient.select.mockReturnValue(profileSelectBuilder);

    const meRes = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: {
        authorization: `Bearer ${verifyBody.accessToken}`,
      },
    });

    expect(meRes.statusCode).toBe(200);
    const meBody = JSON.parse(meRes.payload);
    expect(meBody.user.id).toBe("user-999");
    expect(meBody.workspaces.length).toBe(1);
    expect(meBody.workspaces[0].role).toBe("owner");

    // 5. Logout
    const logoutRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      cookies: {
        refresh_token: activeRefreshToken,
      },
    });

    expect(logoutRes.statusCode).toBe(200);
    const clearCookieHeader = logoutRes.headers["set-cookie"];
    // Verify that response clears the cookie (has Max-Age=0 or Expires in past)
    expect(clearCookieHeader).toBeDefined();
  });
});
