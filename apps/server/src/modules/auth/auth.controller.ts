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
} from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { AuthApplicationService } from "./services/auth-application.service.js";
import { Public } from "../../common/security/public.decorator.js";
import { CurrentUser } from "../../common/security/current-user.decorator.js";
import { ConfigService } from "@rishi/config";

export class RequestOtpDto {
  email!: string;
}

export class VerifyOtpDto {
  email!: string;
  code!: string;
}

@Controller("auth")
export class AuthController {
  constructor(
    @Inject(AuthApplicationService) private readonly authAppService: AuthApplicationService,
    @Inject(ConfigService) private readonly configService: ConfigService
  ) {}

  @Public()
  @Post("request-otp")
  @HttpCode(HttpStatus.OK)
  public async requestOtp(
    @Body() dto: RequestOtpDto
  ): Promise<{ success: boolean; message: string }> {
    await this.authAppService.requestOtp(dto.email);
    return {
      success: true,
      message: "One-Time Password has been dispatched to your email address.",
    };
  }

  @Public()
  @Post("verify-otp")
  @HttpCode(HttpStatus.OK)
  public async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Req() request: any,
    @Res({ passthrough: true }) response: any
  ): Promise<{ accessToken: string }> {
    const userAgent = request.headers["user-agent"] || "unknown";
    const ip = request.ip || "unknown";
    const deviceMetadata = { userAgent, ip };

    const { accessToken, refreshToken } = await this.authAppService.verifyOtp(
      dto.email,
      dto.code,
      deviceMetadata
    );

    this.setRefreshTokenCookie(response, refreshToken);

    return { accessToken };
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  public async refresh(
    @Req() request: any,
    @Res({ passthrough: true }) response: any
  ): Promise<{ accessToken: string }> {
    const oldRefreshToken = this.getUnsignedRefreshToken(request);
    if (!oldRefreshToken) {
      throw new UnauthorizedException("Invalid or missing refresh token signature.");
    }
    const userAgent = request.headers["user-agent"] || "unknown";
    const ip = request.ip || "unknown";
    const deviceMetadata = { userAgent, ip };

    const { accessToken, refreshToken } = await this.authAppService.refreshSession(
      oldRefreshToken,
      deviceMetadata
    );

    this.setRefreshTokenCookie(response, refreshToken);

    return { accessToken };
  }

  @Public()
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  public async logout(
    @Req() request: any,
    @Res({ passthrough: true }) response: any
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
  public async getMe(@CurrentUser() user: any) {
    return this.authAppService.getMe(user.id);
  }

  // --- Helper Methods ---

  private getUnsignedRefreshToken(request: any): string | null {
    const cookieVal = request.cookies["refresh_token"];
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
    const isProd = this.configService.get("NODE_ENV") === "production";

    response.setCookie("refresh_token", refreshToken, {
      path: "/",
      httpOnly: true,
      secure: isProd,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      signed: true,
    });
  }
}
