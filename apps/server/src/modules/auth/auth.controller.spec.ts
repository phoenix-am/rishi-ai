import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import { ValidationPipe } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { ConfigService } from "@rishi/config";
import { AuthModule } from "./auth.module.js";
import { AuthApplicationService } from "./services/auth-application.service.js";
import { GoogleOAuthService } from "./services/google-oauth.service.js";
import { JwtTokenService } from "./services/jwt-token.service.js";
import { DatabaseModule } from "../../foundation/database/database.module.js";
import { bootstrapSecurity } from "../../foundation/bootstrap/bootstrap-security.js";
import { bootstrapVersioning } from "../../foundation/bootstrap/bootstrap-versioning.js";

describe("AuthController integration", () => {
  let app: NestFastifyApplication;
  let authService: {
    requestPasswordlessOtp: ReturnType<typeof vi.fn>;
    verifyPasswordlessOtp: ReturnType<typeof vi.fn>;
    refreshSession: ReturnType<typeof vi.fn>;
    revokeSession: ReturnType<typeof vi.fn>;
    getMe: ReturnType<typeof vi.fn>;
    handleGoogleLoginCallback: ReturnType<typeof vi.fn>;
  };
  let googleOAuth: {
    getAuthorizationUrl: ReturnType<typeof vi.fn>;
    exchangeCode: ReturnType<typeof vi.fn>;
  };

  const keys = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  beforeEach(async () => {
    authService = {
      requestPasswordlessOtp: vi.fn().mockResolvedValue(undefined),
      verifyPasswordlessOtp: vi.fn().mockResolvedValue({
        accessToken: "access-token",
        refreshToken: "refresh-token",
      }),
      refreshSession: vi.fn().mockResolvedValue({
        accessToken: "rotated-access-token",
        refreshToken: "rotated-refresh-token",
      }),
      revokeSession: vi.fn().mockResolvedValue(undefined),
      getMe: vi.fn().mockResolvedValue({ user: { id: "user-1" }, workspaces: [] }),
      handleGoogleLoginCallback: vi.fn().mockResolvedValue({
        accessToken: "google-access-token",
        refreshToken: "google-refresh-token",
      }),
    };
    googleOAuth = {
      getAuthorizationUrl: vi.fn(
        (state: string) => `https://accounts.google.com/o/oauth2/v2/auth?state=${state}`
      ),
      exchangeCode: vi.fn().mockResolvedValue({
        googleId: "google-1",
        email: "user@example.com",
      }),
    };

    const config = new ConfigService({
      NODE_ENV: "test",
      PORT: "3001",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/rishi_test",
      AES_MASTER_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      LOG_LEVEL: "error",
      JWT_PRIVATE_KEY: keys.privateKey,
      JWT_PUBLIC_KEY: keys.publicKey,
      AUTH_SUCCESS_REDIRECT_URL: "http://localhost:5173/auth/callback",
      AUTH_FAILURE_REDIRECT_URL: "http://localhost:5173/login?error=oauth_failed",
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule, AuthModule],
    })
      .overrideProvider(ConfigService)
      .useValue(config)
      .overrideProvider(AuthApplicationService)
      .useValue(authService)
      .overrideProvider(GoogleOAuthService)
      .useValue(googleOAuth)
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await bootstrapSecurity(app);
    bootstrapVersioning(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(async () => {
    await app?.close();
  });

  it("validates and dispatches a passwordless OTP request", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/request-otp",
      payload: { email: "user@example.com" },
    });
    expect(response.statusCode).toBe(200);
    expect(authService.requestPasswordlessOtp).toHaveBeenCalledWith({ email: "user@example.com" });

    const invalidResponse = await app.inject({
      method: "POST",
      url: "/api/v1/auth/request-otp",
      payload: { email: "not-an-email" },
    });
    expect(invalidResponse.statusCode).toBe(400);
  });

  it("issues and rotates a signed HttpOnly refresh cookie", async () => {
    const verifyResponse = await app.inject({
      method: "POST",
      url: "/api/v1/auth/verify-otp",
      payload: { email: "user@example.com", code: "123456" },
    });
    expect(verifyResponse.statusCode).toBe(200);
    const refreshCookie = verifyResponse.cookies.find((cookie) => cookie.name === "refresh_token");
    expect(refreshCookie).toMatchObject({ httpOnly: true, sameSite: "Strict" });

    const refreshResponse = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      cookies: { refresh_token: refreshCookie!.value },
    });
    expect(refreshResponse.statusCode).toBe(200);
    expect(authService.refreshSession).toHaveBeenCalledWith(
      "refresh-token",
      expect.objectContaining({ ip: expect.any(String) })
    );
    expect(refreshResponse.cookies.find((cookie) => cookie.name === "refresh_token")).toBeDefined();
  });

  it("protects the current-user endpoint with an RS256 token", async () => {
    const accessToken = await app.get(JwtTokenService).signToken({
      sub: "user-1",
      email: "user@example.com",
      role: "user",
    });
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(response.statusCode).toBe(200);
    expect(authService.getMe).toHaveBeenCalledWith("user-1");

    const unauthenticated = await app.inject({ method: "GET", url: "/api/v1/auth/me" });
    expect(unauthenticated.statusCode).toBe(401);
  });

  it("uses a signed OAuth state cookie and the approved callback flow", async () => {
    const beginResponse = await app.inject({ method: "GET", url: "/api/v1/auth/google" });
    expect(beginResponse.statusCode).toBe(302);
    const stateCookie = beginResponse.cookies.find((cookie) => cookie.name === "oauth_state");
    const location = new URL(beginResponse.headers.location!);
    const state = location.searchParams.get("state")!;
    expect(stateCookie).toMatchObject({ httpOnly: true, sameSite: "Lax" });

    const callbackResponse = await app.inject({
      method: "GET",
      url: `/api/v1/auth/google/callback?code=google-code&state=${encodeURIComponent(state)}`,
      cookies: { oauth_state: stateCookie!.value },
    });
    expect(callbackResponse.statusCode).toBe(302);
    expect(callbackResponse.headers.location).toBe("http://localhost:5173/auth/callback");
    expect(googleOAuth.exchangeCode).toHaveBeenCalledWith("google-code");
    expect(authService.handleGoogleLoginCallback).toHaveBeenCalled();
    expect(
      callbackResponse.cookies.find((cookie) => cookie.name === "refresh_token")
    ).toBeDefined();
  });

  it("redirects an invalid OAuth state without exchanging credentials", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/auth/google/callback?code=google-code&state=invalid",
    });
    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe("http://localhost:5173/login?error=oauth_failed");
    expect(googleOAuth.exchangeCode).not.toHaveBeenCalled();
  });
});
