import { ICreator } from "@rishi/domain";

export interface AuthSession {
  creator: ICreator;
  issuedAt: Date;
  expiresAt: Date;
}

export interface IAuthTokenService {
  signToken(payload: Record<string, unknown>): Promise<string>;
  verifyToken(token: string): Promise<Record<string, unknown>>;
}
