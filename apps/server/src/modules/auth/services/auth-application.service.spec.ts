import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { AuthApplicationService } from "./auth-application.service.js";
import { InMemoryOtpStore } from "./otp.store.js";

function selectResult(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  };
}

describe("InMemoryOtpStore", () => {
  let store: InMemoryOtpStore;

  beforeEach(() => {
    store = new InMemoryOtpStore();
  });

  afterEach(() => {
    store.onModuleDestroy();
  });

  it("generates a six-digit OTP, normalizes email, and prevents replay", () => {
    const code = store.generateAndStore(" Founder@Rishi.AI ");

    expect(code).toMatch(/^\d{6}$/u);
    expect(store.verifyAndConsume("founder@rishi.ai", code)).toBe(true);
    expect(store.verifyAndConsume("founder@rishi.ai", code)).toBe(false);
  });

  it("limits incorrect verification attempts", () => {
    const code = store.generateAndStore("founder@rishi.ai", 60_000, 2);

    expect(store.verifyAndConsume("founder@rishi.ai", "000000")).toBe(false);
    expect(store.verifyAndConsume("founder@rishi.ai", "000001")).toBe(false);
    expect(store.verifyAndConsume("founder@rishi.ai", code)).toBe(false);
  });

  it("rejects expired codes", () => {
    const code = store.generateAndStore("founder@rishi.ai", -1);
    expect(store.verifyAndConsume("founder@rishi.ai", code)).toBe(false);
  });
});

describe("AuthApplicationService", () => {
  let service: AuthApplicationService;
  let otpStore: InMemoryOtpStore;
  let database: any;
  let transactionManager: any;
  let emailProvider: any;
  let tokenService: any;

  beforeEach(() => {
    database = {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      transaction: vi.fn(),
    };
    transactionManager = {
      runInTransaction: vi.fn(async (_database, work) => work()),
    };
    emailProvider = { sendOtp: vi.fn().mockResolvedValue(undefined) };
    tokenService = { signToken: vi.fn().mockResolvedValue("signed-access-token") };
    otpStore = new InMemoryOtpStore();
    service = new AuthApplicationService(
      {
        get client() {
          return database;
        },
      } as any,
      transactionManager,
      { db: database },
      otpStore,
      emailProvider,
      tokenService
    );
  });

  afterEach(() => {
    otpStore.onModuleDestroy();
  });

  it("normalizes an email and dispatches a six-digit OTP", async () => {
    await service.requestPasswordlessOtp({ email: " User@Example.COM " });
    expect(emailProvider.sendOtp).toHaveBeenCalledWith(
      "user@example.com",
      expect.stringMatching(/^\d{6}$/u)
    );
  });

  it("rejects an empty email before dispatch", async () => {
    await expect(service.requestPasswordlessOtp({ email: " " })).rejects.toBeInstanceOf(
      BadRequestException
    );
    expect(emailProvider.sendOtp).not.toHaveBeenCalled();
  });

  it("invalidates an OTP when email delivery fails", async () => {
    emailProvider.sendOtp.mockRejectedValueOnce(new Error("delivery failed"));
    await expect(service.requestPasswordlessOtp({ email: "user@example.com" })).rejects.toThrow(
      "delivery failed"
    );
    const undispatchedCode = emailProvider.sendOtp.mock.calls[0][1];
    await expect(
      service.verifyPasswordlessOtp({ email: "user@example.com", code: undispatchedCode })
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("atomically provisions a user, workspace, membership, and session", async () => {
    const email = "new@example.com";
    const code = otpStore.generateAndStore(email);
    const user = { id: "user-1", email, role: "user" };
    const workspace = { id: "workspace-1", ownerId: user.id };
    database.select.mockReturnValueOnce(selectResult([]));

    const inserts = [
      { values: vi.fn().mockReturnThis(), returning: vi.fn().mockResolvedValue([user]) },
      { values: vi.fn().mockReturnThis(), returning: vi.fn().mockResolvedValue([workspace]) },
      { values: vi.fn().mockResolvedValue(undefined) },
      { values: vi.fn().mockResolvedValue(undefined) },
    ];
    inserts.forEach((builder) => database.insert.mockReturnValueOnce(builder));

    const result = await service.verifyPasswordlessOtp(
      { email, code },
      { userAgent: "vitest", ip: "127.0.0.1" }
    );

    expect(result.accessToken).toBe("signed-access-token");
    expect(result.refreshToken).toMatch(/^[a-f0-9]{80}$/u);
    expect(transactionManager.runInTransaction).toHaveBeenCalledOnce();
    expect(database.insert).toHaveBeenCalledTimes(4);
    expect(tokenService.signToken).toHaveBeenCalledWith({
      sub: user.id,
      email,
      role: "user",
    });
  });

  it("reuses an existing identity for OTP and Google sign-in", async () => {
    const user = { id: "user-1", email: "existing@example.com", role: "user" };
    const membership = { userId: user.id, workspaceId: "workspace-1", role: "owner" };
    database.select
      .mockReturnValueOnce(selectResult([user]))
      .mockReturnValueOnce(selectResult([membership]))
      .mockReturnValueOnce(selectResult([user]))
      .mockReturnValueOnce(selectResult([membership]));
    database.insert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });

    const code = otpStore.generateAndStore(user.email);
    await service.verifyPasswordlessOtp({ email: user.email, code });
    await service.handleGoogleLoginCallback({ email: user.email, googleId: "google-1" });

    expect(database.insert).toHaveBeenCalledTimes(2);
  });

  it("rejects an invalid OTP without touching persistence", async () => {
    await expect(
      service.verifyPasswordlessOtp({ email: "user@example.com", code: "999999" })
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(transactionManager.runInTransaction).not.toHaveBeenCalled();
  });

  it("rotates an active refresh session exactly once", async () => {
    const session = {
      id: "session-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 60_000),
    };
    const user = { id: "user-1", email: "user@example.com", role: "user" };
    database.select
      .mockReturnValueOnce(selectResult([session]))
      .mockReturnValueOnce(selectResult([user]));
    const updateBuilder = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: session.id }]),
    };
    database.update.mockReturnValue(updateBuilder);
    database.insert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });

    await expect(service.refreshSession("refresh-token")).resolves.toMatchObject({
      accessToken: "signed-access-token",
    });
    expect(updateBuilder.returning).toHaveBeenCalledOnce();
  });

  it("rejects a refresh token that loses the rotation race", async () => {
    const session = {
      id: "session-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 60_000),
    };
    const user = { id: "user-1", email: "user@example.com", role: "user" };
    database.select
      .mockReturnValueOnce(selectResult([session]))
      .mockReturnValueOnce(selectResult([user]));
    database.update.mockReturnValue({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([]),
    });

    await expect(service.refreshSession("replayed-token")).rejects.toBeInstanceOf(
      UnauthorizedException
    );
    expect(database.insert).not.toHaveBeenCalled();
  });

  it("revokes a refresh session by its hash", async () => {
    const updateBuilder = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
    };
    database.update.mockReturnValue(updateBuilder);
    await service.revokeSession("refresh-token");
    expect(database.update).toHaveBeenCalledOnce();
  });
});
