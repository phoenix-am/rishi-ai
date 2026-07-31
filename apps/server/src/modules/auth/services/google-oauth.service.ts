import { ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@rishi/config";
import type { GoogleSessionPayload } from "@rishi/auth";
import { OAuthCallbackException } from "../auth.exceptions.js";

interface GoogleTokenResponse {
  access_token?: unknown;
}

interface GoogleUserInfo {
  sub?: unknown;
  email?: unknown;
  email_verified?: unknown;
  given_name?: unknown;
  family_name?: unknown;
}

export class GoogleOAuthService {
  public static readonly scopes = ["openid", "email", "profile"] as const;

  constructor(private readonly config: ConfigService) {}

  public getAuthorizationUrl(state: string): string {
    this.assertEnabled();
    if (!state) {
      throw new OAuthCallbackException();
    }
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({
      client_id: this.config.get("GOOGLE_OAUTH_CLIENT_ID")!,
      redirect_uri: this.config.get("GOOGLE_OAUTH_CALLBACK_URL")!,
      response_type: "code",
      scope: GoogleOAuthService.scopes.join(" "),
      state,
      prompt: "select_account",
    }).toString();
    return url.toString();
  }

  public async exchangeCode(code: string): Promise<GoogleSessionPayload> {
    this.assertEnabled();
    if (!code) {
      throw new OAuthCallbackException();
    }
    try {
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: this.config.get("GOOGLE_OAUTH_CLIENT_ID")!,
          client_secret: this.config.get("GOOGLE_OAUTH_CLIENT_SECRET")!,
          redirect_uri: this.config.get("GOOGLE_OAUTH_CALLBACK_URL")!,
          grant_type: "authorization_code",
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!tokenResponse.ok) {
        throw new Error("Google token exchange failed.");
      }
      const tokenPayload = (await tokenResponse.json()) as GoogleTokenResponse;
      if (typeof tokenPayload.access_token !== "string") {
        throw new Error("Google token response is invalid.");
      }

      const userResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: { authorization: `Bearer ${tokenPayload.access_token}` },
        signal: AbortSignal.timeout(10_000),
      });
      if (!userResponse.ok) {
        throw new Error("Google user lookup failed.");
      }
      const profile = (await userResponse.json()) as GoogleUserInfo;
      if (
        typeof profile.sub !== "string" ||
        typeof profile.email !== "string" ||
        profile.email_verified !== true
      ) {
        throw new Error("Google identity is missing a verified email address.");
      }

      return {
        googleId: profile.sub,
        email: profile.email,
        firstName: typeof profile.given_name === "string" ? profile.given_name : undefined,
        lastName: typeof profile.family_name === "string" ? profile.family_name : undefined,
      };
    } catch {
      throw new OAuthCallbackException();
    }
  }

  private assertEnabled(): void {
    if (!this.config.get("GOOGLE_OAUTH_ENABLED")) {
      throw new ServiceUnavailableException("Google authentication is not configured.");
    }
  }
}
