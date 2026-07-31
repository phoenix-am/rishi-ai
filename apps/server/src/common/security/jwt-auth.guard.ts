import {
  Injectable,
  Inject,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "./public.decorator.js";
import { JwtTokenService } from "../../modules/auth/services/jwt-token.service.js";
import { ConfigService } from "@rishi/config";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly tokenService: JwtTokenService;

  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(ConfigService) config: ConfigService
  ) {
    this.tokenService = new JwtTokenService(config);
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
      const payload = await this.tokenService.verifyToken(token);
      if (
        typeof payload.sub !== "string" ||
        typeof payload.email !== "string" ||
        typeof payload.role !== "string"
      ) {
        throw new Error("Authentication token claims are invalid.");
      }

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
}
