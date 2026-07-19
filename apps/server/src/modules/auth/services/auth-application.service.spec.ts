import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateKeyPairSync } from "crypto";
import { AuthApplicationService, TokenPayload } from "./auth-application.service.js";
import { InMemoryOtpStore } from "./otp.store.js";
import { UnauthorizedException, BadRequestException } from "@nestjs/common";
import jwt from "jsonwebtoken";

describe("InMemoryOtpStore", () => {
  let store: InMemoryOtpStore;

  beforeEach(() => {
    store = new InMemoryOtpStore();
  });

  it("should generate a 6-digit OTP code and verify it successfully", () => {
    const email = "founder@rishi.ai";
    const code = store.generateAndStore(email);

    expect(code).toHaveLength(6);
    expect(Number(code)).not.toBeNaN();

    const verified = store.verifyAndConsume(email, code);
    expect(verified).toBe(true);
  });

  it("should fail validation for incorrect or expired codes", () => {
    const email = "founder@rishi.ai";
    const code = store.generateAndStore(email);

    // Mismatch code verification
    expect(store.verifyAndConsume(email, "000000")).toBe(false);

    // Re-verify code (should fail as it gets consumed immediately on first try)
    expect(store.verifyAndConsume(email, code)).toBe(false);
  });

  it("should fail validation for expired codes", () => {
    const email = "founder@rishi.ai";
    const code = store.generateAndStore(email, -1000); // expired already

    expect(store.verifyAndConsume(email, code)).toBe(false);
  });
});

describe("AuthApplicationService", () => {
  let authService: AuthApplicationService;
  let mockDbService: any;
  let mockTxManager: any;
  let mockDrizzleClient: any;
  let mockEmailProvider: any;
  let mockConfigService: any;
  let otpStore: InMemoryOtpStore;

  // Real RSA keys for sign/verify testing (shortened for test performance)
  // Generate valid RS256 key pair on the fly for test signature validation
  const { privateKey: testPrivateKey, publicKey: testPublicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  beforeEach(() => {
    otpStore = new InMemoryOtpStore();
    mockEmailProvider = {
      sendOtp: vi.fn().mockResolvedValue(undefined),
    };
    mockConfigService = {
      get: vi.fn((key) => {
        if (key === "JWT_PRIVATE_KEY") return testPrivateKey;
        if (key === "JWT_PUBLIC_KEY") return testPublicKey;
        if (key === "NODE_ENV") return "test";
        return "";
      }),
    };

    // Chainable Mock Builder for Drizzle
    const selectMock = vi.fn();
    const updateMock = vi.fn();
    const insertMock = vi.fn();

    mockDrizzleClient = {
      transaction: vi.fn((cb) => cb(mockDrizzleClient)),
      select: selectMock,
      update: updateMock,
      insert: insertMock,
    };

    mockTxManager = {
      runInTransaction: vi.fn((_db, cb) => cb()),
      getActiveClient: vi.fn(),
    };

    mockDbService = {
      get client() {
        return mockDrizzleClient;
      },
    };

    authService = new AuthApplicationService(
      mockDbService,
      mockTxManager,
      { pool: {}, db: mockDrizzleClient },
      otpStore,
      mockEmailProvider,
      mockConfigService
    );
  });

  describe("requestOtp", () => {
    it("should generate OTP and dispatch email", async () => {
      const email = "test@rishi.ai";
      await authService.requestOtp(email);

      expect(mockEmailProvider.sendOtp).toHaveBeenCalledWith(
        email,
        expect.stringMatching(/^\d{6}$/)
      );
    });

    it("should throw BadRequestException if email is empty", async () => {
      await expect(authService.requestOtp("")).rejects.toThrow(BadRequestException);
    });
  });

  describe("verifyOtp", () => {
    it("should register user, default workspace, and members inside a transaction on first sign-in", async () => {
      const email = "new-user@rishi.ai";
      const code = otpStore.generateAndStore(email);

      // Setup Drizzle mocks
      // 1. Check if user exists (returns empty array = new user)
      // 2. Insert user returning UserEntity
      // 3. Insert workspace returning WorkspaceEntity
      // 4. Insert workspace member
      // 5. Insert session
      const userMock = { id: "user-1", email, role: "user" };
      const workspaceMock = { id: "workspace-1", name: "Personal Workspace", ownerId: "user-1" };

      const selectBuilder = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]), // mock user doesn't exist
      };
      mockDrizzleClient.select.mockReturnValue(selectBuilder);

      const insertBuilder = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn(),
      };
      mockDrizzleClient.insert.mockReturnValue(insertBuilder);

      // Return mock values sequentially for insertions
      insertBuilder.returning
        .mockResolvedValueOnce([userMock]) // for user insertion
        .mockResolvedValueOnce([workspaceMock]); // for workspace insertion

      const result = await authService.verifyOtp(email, code);

      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();

      // Verify RS256 Access Token contents
      const decoded = jwt.verify(result.accessToken, testPublicKey, {
        algorithms: ["RS256"],
      }) as TokenPayload;
      expect(decoded.sub).toBe("user-1");
      expect(decoded.email).toBe(email);
      expect(decoded.role).toBe("user");

      expect(mockTxManager.runInTransaction).toHaveBeenCalled();
      expect(mockDrizzleClient.insert).toHaveBeenCalledTimes(4); // User, Workspace, Member, Session
    });

    it("should reuse existing user and issue new session", async () => {
      const email = "existing@rishi.ai";
      const code = otpStore.generateAndStore(email);

      const existingUser = { id: "user-existing", email, role: "user", createdAt: new Date() };
      const existingMember = { userId: "user-existing", workspaceId: "ws-1", role: "owner" };

      // select builder chain mocks
      mockDrizzleClient.select.mockImplementation(() => {
        return {
          from: vi.fn().mockImplementation(() => {
            return {
              where: vi.fn().mockImplementation(() => {
                return {
                  limit: vi.fn().mockImplementation(async () => {
                    // First select query is user find: returns existing user
                    // Second select query is memberships check: returns membership
                    if (mockDrizzleClient.select.mock.calls.length === 1) {
                      return [existingUser];
                    }
                    return [existingMember];
                  }),
                };
              }),
            };
          }),
        };
      });

      const insertBuilder = {
        values: vi.fn().mockReturnThis(),
      };
      mockDrizzleClient.insert.mockReturnValue(insertBuilder);

      const result = await authService.verifyOtp(email, code);

      expect(result.accessToken).toBeDefined();
      const decoded = jwt.verify(result.accessToken, testPublicKey, {
        algorithms: ["RS256"],
      }) as TokenPayload;
      expect(decoded.sub).toBe("user-existing");
      expect(mockDrizzleClient.insert).toHaveBeenCalledTimes(1); // Only Session insert
    });

    it("should throw UnauthorizedException for bad OTP code", async () => {
      const email = "user@rishi.ai";
      otpStore.generateAndStore(email);

      await expect(authService.verifyOtp(email, "999999")).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("refreshSession & revokeSession", () => {
    it("should rotate session and return new tokens", async () => {
      const mockSession = {
        id: "session-1",
        userId: "user-1",
        refreshTokenHash: "hash",
        isRevoked: false,
        expiresAt: new Date(Date.now() + 100000),
      };
      const mockUser = { id: "user-1", email: "user@rishi.ai", role: "user" };

      // select mock calls: 1. find session, 2. find user
      mockDrizzleClient.select.mockImplementation(() => {
        return {
          from: vi.fn().mockImplementation(() => {
            return {
              where: vi.fn().mockImplementation(() => {
                return {
                  limit: vi.fn().mockImplementation(async () => {
                    if (mockDrizzleClient.select.mock.calls.length === 1) {
                      return [mockSession];
                    }
                    return [mockUser];
                  }),
                };
              }),
            };
          }),
        };
      });

      const updateBuilder = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };
      mockDrizzleClient.update.mockReturnValue(updateBuilder);

      const insertBuilder = {
        values: vi.fn().mockReturnThis(),
      };
      mockDrizzleClient.insert.mockReturnValue(insertBuilder);

      const result = await authService.refreshSession("old-token");

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(mockDrizzleClient.update).toHaveBeenCalled(); // revoked old session
      expect(mockDrizzleClient.insert).toHaveBeenCalled(); // inserted new session
    });

    it("should revoke session on logout", async () => {
      const updateBuilder = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };
      mockDrizzleClient.update.mockReturnValue(updateBuilder);

      await authService.revokeSession("some-token");

      expect(mockDrizzleClient.update).toHaveBeenCalled();
    });
  });
});
