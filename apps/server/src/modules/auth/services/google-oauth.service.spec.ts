import { afterEach, describe, expect, it, vi } from "vitest";
import { ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@rishi/config";
import { GoogleOAuthService } from "./google-oauth.service.js";

function config(enabled = true): ConfigService {
  return new ConfigService({
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/rishi_test",
    AES_MASTER_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    JWT_PRIVATE_KEY: "test-private-key",
    JWT_PUBLIC_KEY: "test-public-key",
    GOOGLE_OAUTH_ENABLED: String(enabled),
    ...(enabled
      ? {
          GOOGLE_OAUTH_CLIENT_ID: "google-client-id",
          GOOGLE_OAUTH_CLIENT_SECRET: "google-client-secret",
          GOOGLE_OAUTH_CALLBACK_URL: "http://localhost:3000/api/v1/auth/google/callback",
        }
      : {}),
  });
}

describe("GoogleOAuthService", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates an authorization URL with the approved minimal scopes", () => {
    const url = new URL(new GoogleOAuthService(config()).getAuthorizationUrl("csrf-state"));
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("scope")).toBe("openid email profile");
    expect(url.searchParams.get("state")).toBe("csrf-state");
    expect(url.searchParams.get("response_type")).toBe("code");
  });

  it("exchanges a code and accepts only a verified Google email", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "google-access-token" }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sub: "google-1",
            email: "User@Example.com",
            email_verified: true,
            given_name: "Rishi",
          }),
          { status: 200 }
        )
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      new GoogleOAuthService(config()).exchangeCode("authorization-code")
    ).resolves.toEqual({
      googleId: "google-1",
      email: "User@Example.com",
      firstName: "Rishi",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("maps invalid or unverified provider responses to a stable authentication error", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ access_token: "google-access-token" }), { status: 200 })
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ sub: "google-1", email: "user@example.com", email_verified: false }),
            { status: 200 }
          )
        )
    );
    await expect(new GoogleOAuthService(config()).exchangeCode("bad-code")).rejects.toBeInstanceOf(
      UnauthorizedException
    );
  });

  it("fails closed when Google OAuth is disabled", () => {
    expect(() => new GoogleOAuthService(config(false)).getAuthorizationUrl("state")).toThrow(
      ServiceUnavailableException
    );
  });
});
