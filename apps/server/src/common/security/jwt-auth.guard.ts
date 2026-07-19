import {
  Injectable,
  Inject,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ConfigService } from "@rishi/config";
import { IS_PUBLIC_KEY } from "./public.decorator.js";
import jwt from "jsonwebtoken";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private publicKeyPem: string;

  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(ConfigService) private readonly configService: ConfigService
  ) {
    const rawKey = this.configService.get("JWT_PUBLIC_KEY");
    this.publicKeyPem = this.decodePemKey(rawKey);
  }

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Bypass check for public routes
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException("Authentication token is missing.");
    }

    try {
      const payload = jwt.verify(token, this.publicKeyPem, {
        algorithms: ["RS256"],
      }) as Record<string, any>;

      // Inject user context into request
      request.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };

      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired authentication token.");
    }
  }

  private extractTokenFromHeader(request: any): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader || typeof authHeader !== "string") {
      return null;
    }
    const [type, token] = authHeader.split(" ");
    return type === "Bearer" ? token || null : null;
  }

  private decodePemKey(key: string): string {
    if (!key) {
      return "";
    }
    if (key.includes("-----BEGIN")) {
      return key;
    }
    try {
      const decoded = Buffer.from(key, "base64").toString("utf-8");
      if (decoded.includes("-----BEGIN")) {
        return decoded;
      }
    } catch {
      // Fallback if not base64 encoded
    }
    return key;
  }
}
