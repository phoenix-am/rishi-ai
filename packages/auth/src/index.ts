export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

export interface AuthSession {
  user: AuthenticatedUser;
  issuedAt: Date;
  expiresAt: Date;
}

export interface IAuthTokenService {
  signToken(payload: Record<string, unknown>): Promise<string>;
  verifyToken(token: string): Promise<Record<string, unknown>>;
}

export interface OtpGenerationPayload {
  email: string;
}

export interface OtpVerificationPayload {
  email: string;
  code: string;
}

export interface GoogleSessionPayload {
  email: string;
  googleId: string;
  firstName?: string;
  lastName?: string;
}

export interface DeviceMetadata {
  userAgent?: string;
  ip?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface IAuthService {
  requestPasswordlessOtp(payload: OtpGenerationPayload): Promise<void>;
  verifyPasswordlessOtp(
    payload: OtpVerificationPayload,
    deviceMetadata?: DeviceMetadata
  ): Promise<AuthTokens>;
  handleGoogleLoginCallback(
    payload: GoogleSessionPayload,
    deviceMetadata?: DeviceMetadata
  ): Promise<AuthTokens>;
}

export interface IEmailProvider {
  sendOtp(email: string, code: string): Promise<void>;
}

export const EMAIL_PROVIDER = Symbol.for("@rishi/auth/IEmailProvider");
