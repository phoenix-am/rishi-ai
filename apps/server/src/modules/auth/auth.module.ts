import { Module } from "@nestjs/common";
import { APP_GUARD, Reflector } from "@nestjs/core";
import { EMAIL_PROVIDER } from "@rishi/auth";
import { ConfigService } from "@rishi/config";
import { AuthController } from "./auth.controller.js";
import { AuthApplicationService } from "./services/auth-application.service.js";
import { InMemoryOtpStore } from "./services/otp.store.js";
import { createEmailProvider } from "./services/email.providers.js";
import { GoogleOAuthService } from "./services/google-oauth.service.js";
import { JwtTokenService } from "./services/jwt-token.service.js";
import { JwtAuthGuard } from "../../common/security/jwt-auth.guard.js";

@Module({
  controllers: [AuthController],
  providers: [
    Reflector,
    AuthApplicationService,
    InMemoryOtpStore,
    JwtTokenService,
    {
      provide: EMAIL_PROVIDER,
      useFactory: createEmailProvider,
      inject: [ConfigService],
    },
    {
      provide: GoogleOAuthService,
      useFactory: (config: ConfigService) => new GoogleOAuthService(config),
      inject: [ConfigService],
    },
    // Global Guard Registration for JwtAuthGuard (Secure-by-default)
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [AuthApplicationService, JwtTokenService],
})
export class AuthModule {}
