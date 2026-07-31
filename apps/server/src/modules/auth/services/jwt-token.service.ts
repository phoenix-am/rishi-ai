import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@rishi/config";
import type { IAuthTokenService } from "@rishi/auth";
import jwt from "jsonwebtoken";
import { createPrivateKey, createPublicKey, timingSafeEqual } from "node:crypto";

function decodePemKey(key: string): string {
  if (key.includes("-----BEGIN")) {
    return key;
  }
  const decoded = Buffer.from(key, "base64").toString("utf8");
  return decoded.includes("-----BEGIN") ? decoded : key;
}

@Injectable()
export class JwtTokenService implements IAuthTokenService {
  private readonly privateKey: string;
  private readonly publicKey: string;

  constructor(@Inject(ConfigService) config: ConfigService) {
    this.privateKey = decodePemKey(config.get("JWT_PRIVATE_KEY"));
    this.publicKey = decodePemKey(config.get("JWT_PUBLIC_KEY"));
    const privateKey = createPrivateKey(this.privateKey);
    const publicKey = createPublicKey(this.publicKey);
    if (privateKey.asymmetricKeyType !== "rsa" || publicKey.asymmetricKeyType !== "rsa") {
      throw new Error("JWT signing configuration must contain an RSA key pair.");
    }
    const derivedPublicKey = createPublicKey(privateKey).export({ type: "spki", format: "der" });
    const configuredPublicKey = publicKey.export({ type: "spki", format: "der" });
    if (
      derivedPublicKey.length !== configuredPublicKey.length ||
      !timingSafeEqual(derivedPublicKey, configuredPublicKey)
    ) {
      throw new Error("JWT signing configuration contains a mismatched key pair.");
    }
  }

  public async signToken(payload: Record<string, unknown>): Promise<string> {
    return jwt.sign(payload, this.privateKey, {
      algorithm: "RS256",
      expiresIn: "15m",
    });
  }

  public async verifyToken(token: string): Promise<Record<string, unknown>> {
    const payload = jwt.verify(token, this.publicKey, { algorithms: ["RS256"] });
    if (typeof payload === "string") {
      throw new Error("Authentication token payload is invalid.");
    }
    return payload;
  }
}
