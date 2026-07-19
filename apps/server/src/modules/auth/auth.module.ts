import { Module, Injectable, Inject } from "@nestjs/common";
import { APP_GUARD, Reflector } from "@nestjs/core";
import { AuthController } from "./auth.controller.js";
import { AuthApplicationService } from "./services/auth-application.service.js";
import { InMemoryOtpStore } from "./services/otp.store.js";
import { IEmailProvider } from "./interfaces/email-provider.interface.js";
import { JwtAuthGuard } from "../../common/security/jwt-auth.guard.js";
import type { ILogger } from "@rishi/logger";

@Injectable()
export class ConsoleEmailProvider implements IEmailProvider {
  constructor(@Inject("ILogger") private readonly logger: ILogger) {}

  public async sendOtp(email: string, code: string): Promise<void> {
    this.logger.info(`[Email OTP Dispatcher] Target: ${email} | Verification Code: ${code}`);
  }
}

@Module({
  controllers: [AuthController],
  providers: [
    Reflector,
    AuthApplicationService,
    InMemoryOtpStore,
    {
      provide: "IEmailProvider",
      useClass: ConsoleEmailProvider,
    },
    // Global Guard Registration for JwtAuthGuard (Secure-by-default)
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [AuthApplicationService],
})
export class AuthModule {}
