import { UnauthorizedException } from "@nestjs/common";

export class InvalidOtpException extends UnauthorizedException {
  constructor() {
    super("Invalid or expired OTP verification code.");
    this.name = "InvalidOtpException";
  }
}

export class OAuthCallbackException extends UnauthorizedException {
  constructor() {
    super("Google authentication could not be completed.");
    this.name = "OAuthCallbackException";
  }
}
