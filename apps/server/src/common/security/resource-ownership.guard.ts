import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { FastifyRequest } from "fastify";
import type { AuthenticatedUser } from "@rishi/auth";
import {
  AUTHORIZATION_RESOURCE_KEY,
  type AuthorizationResourceRequirement,
} from "./authorization-resource.decorator.js";
import { AuthorizationService } from "./authorization.service.js";

interface AuthorizedRequest extends FastifyRequest {
  user?: AuthenticatedUser;
  workspace?: { id: string; name: string; role: string };
  params: Record<string, string | undefined>;
}

@Injectable()
export class ResourceOwnershipGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthorizationService) private readonly authorization: AuthorizationService
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<AuthorizationResourceRequirement>(
      AUTHORIZATION_RESOURCE_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requirement) return true;

    const request = context.switchToHttp().getRequest<AuthorizedRequest>();
    if (!request.user?.id) {
      throw new UnauthorizedException("User authentication context is missing.");
    }
    if (!request.workspace?.id) {
      throw new BadRequestException("Authorized workspace context is missing.");
    }

    const resourceId = request.params?.[requirement.param];
    if (!resourceId) {
      throw new BadRequestException(
        `Authorization resource parameter '${requirement.param}' is required.`
      );
    }

    await this.authorization.assertWorkspaceResource(
      request.workspace.id,
      requirement.type,
      resourceId
    );
    return true;
  }
}
