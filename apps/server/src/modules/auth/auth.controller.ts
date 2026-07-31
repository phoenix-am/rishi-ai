import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Inject,
  UnauthorizedException,
  Query,
  ValidationPipe,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { IsEmail, Matches, MaxLength } from "class-validator";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { AuthApplicationService } from "./services/auth-application.service.js";
import { GoogleOAuthService } from "./services/google-oauth.service.js";
import { Public } from "../../common/security/public.decorator.js";
import { CurrentUser } from "../../common/security/current-user.decorator.js";
import { ConfigService } from "@rishi/config";
import type { AuthenticatedUser, DeviceMetadata } from "@rishi/auth";

export class RequestOtpDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;
}

export class VerifyOtpDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @Matches(/^\d{6}$/u)
  code!: string;
}

@Controller("auth")
export class AuthController {
  constructor(
    @Inject(AuthApplicationService) private readonly authAppService: AuthApplicationService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(GoogleOAuthService) private readonly googleOAuthService: GoogleOAuthService
  ) {}

  @Public()
  @Post("request-otp")
  @HttpCode(HttpStatus.OK)
  public async requestOtp(
    @Body(new ValidationPipe({ transform: true, whitelist: true, expectedType: RequestOtpDto }))
    dto: RequestOtpDto
  ): Promise<{ success: boolean; message: string }> {
    await this.authAppService.requestPasswordlessOtp(dto);
    return {
      success: true,
      message: "One-Time Password has been dispatched to your email address.",
    };
  }

  @Public()
  @Post("verify-otp")
  @HttpCode(HttpStatus.OK)
  public async verifyOtp(
    @Body(new ValidationPipe({ transform: true, whitelist: true, expectedType: VerifyOtpDto }))
    dto: VerifyOtpDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) response: FastifyReply
  ): Promise<{ accessToken: string }> {
    const { accessToken, refreshToken } = await this.authAppService.verifyPasswordlessOtp(
      dto,
      this.getDeviceMetadata(request)
    );

    this.setRefreshTokenCookie(response, refreshToken);

    return { accessToken };
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  public async refresh(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) response: FastifyReply
  ): Promise<{ accessToken: string }> {
    const oldRefreshToken = this.getUnsignedRefreshToken(request);
    if (!oldRefreshToken) {
      throw new UnauthorizedException("Invalid or missing refresh token signature.");
    }
    const { accessToken, refreshToken } = await this.authAppService.refreshSession(
      oldRefreshToken,
      this.getDeviceMetadata(request)
    );

    this.setRefreshTokenCookie(response, refreshToken);

    return { accessToken };
  }

  @Public()
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  public async logout(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) response: FastifyReply
  ): Promise<{ success: boolean }> {
    const refreshToken = this.getUnsignedRefreshToken(request);
    await this.authAppService.revokeSession(refreshToken || "");

    const isProd = this.configService.get("NODE_ENV") === "production";
    response.clearCookie("refresh_token", {
      path: "/",
      httpOnly: true,
      secure: isProd,
      sameSite: "strict",
    });

    return { success: true };
  }

  @Get("me")
  public async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.authAppService.getMe(user.id);
  }

  @Public()
  @Get("google")
  public beginGoogleLogin(@Res() response: FastifyReply): void {
    const state = randomBytes(32).toString("base64url");
    response.setCookie("oauth_state", state, {
      path: "/api/v1/auth/google/callback",
      httpOnly: true,
      secure: this.isProduction(),
      sameSite: "lax",
      maxAge: 10 * 60,
      signed: true,
    });
    response.status(HttpStatus.FOUND).redirect(this.googleOAuthService.getAuthorizationUrl(state));
  }

  @Public()
  @Get("google/callback")
  public async completeGoogleLogin(
    @Query() query: Record<string, unknown>,
    @Req() request: FastifyRequest,
    @Res() response: FastifyReply
  ): Promise<void> {
    try {
      if (typeof query.code !== "string" || typeof query.state !== "string") {
        throw new UnauthorizedException("Google authentication response is invalid.");
      }
      const expectedState = this.getUnsignedCookie(request, "oauth_state");
      if (!expectedState || !this.constantTimeEqual(expectedState, query.state)) {
        throw new UnauthorizedException("Google authentication state is invalid.");
      }

      const googleIdentity = await this.googleOAuthService.exchangeCode(query.code);
      const { refreshToken } = await this.authAppService.handleGoogleLoginCallback(
        googleIdentity,
        this.getDeviceMetadata(request)
      );
      this.setRefreshTokenCookie(response, refreshToken);
      this.clearOAuthStateCookie(response);
      response
        .status(HttpStatus.FOUND)
        .redirect(this.configService.get("AUTH_SUCCESS_REDIRECT_URL"));
    } catch {
      this.clearOAuthStateCookie(response);
      response
        .status(HttpStatus.FOUND)
        .redirect(this.configService.get("AUTH_FAILURE_REDIRECT_URL"));
    }
  }

  // --- Helper Methods ---

  private getUnsignedRefreshToken(request: FastifyRequest): string | null {
    return this.getUnsignedCookie(request, "refresh_token");
  }

  private getUnsignedCookie(request: FastifyRequest, name: string): string | null {
    const cookieVal = request.cookies[name];
    if (!cookieVal) {
      return null;
    }
    const unsigned = request.unsignCookie(cookieVal);
    if (!unsigned.valid || !unsigned.value) {
      return null;
    }
    return unsigned.value;
  }

  private setRefreshTokenCookie(response: FastifyReply, refreshToken: string): void {
    response.setCookie("refresh_token", refreshToken, {
      path: "/",
      httpOnly: true,
      secure: this.isProduction(),
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      signed: true,
    });
  }

  private clearOAuthStateCookie(response: FastifyReply): void {
    response.clearCookie("oauth_state", {
      path: "/api/v1/auth/google/callback",
      httpOnly: true,
      secure: this.isProduction(),
      sameSite: "lax",
    });
  }

  private getDeviceMetadata(request: FastifyRequest): DeviceMetadata {
    return {
      userAgent: request.headers["user-agent"] ?? "unknown",
      ip: request.ip,
    };
  }

  private constantTimeEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
  }

  private isProduction(): boolean {
    return this.configService.get("NODE_ENV") === "production";
  }
}
