import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
  Inject,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { DatabaseService, workspaceMembers, workspaces } from "@rishi/database";
import { IS_PUBLIC_KEY } from "./public.decorator.js";
import { eq, and } from "drizzle-orm";

@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(DatabaseService) private readonly dbService: DatabaseService
  ) {}

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

    // 2. Ensure user is authenticated
    if (!request.user || !request.user.id) {
      throw new UnauthorizedException("User authentication context is missing.");
    }

    // 3. Resolve Workspace ID from headers, query, or path params
    const workspaceId = this.resolveWorkspaceId(request);

    if (!workspaceId) {
      throw new BadRequestException(
        "Workspace context validation failed: Workspace ID is required."
      );
    }

    // 4. Verify membership in database
    const [membership] = await this.dbService.client
      .select({
        workspaceId: workspaces.id,
        name: workspaces.name,
        role: workspaceMembers.role,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(
        and(
          eq(workspaceMembers.userId, request.user.id),
          eq(workspaceMembers.workspaceId, workspaceId)
        )
      )
      .limit(1);

    if (!membership) {
      throw new ForbiddenException(
        "Access Denied: You do not have permissions to access this workspace."
      );
    }

    // 5. Ingest workspace context
    request.workspace = {
      id: membership.workspaceId,
      name: membership.name,
      role: membership.role,
    };

    return true;
  }

  private resolveWorkspaceId(request: any): string | null {
    // Header check (case-insensitive)
    const headerVal = request.headers["x-workspace-id"];
    if (headerVal && typeof headerVal === "string") {
      return headerVal;
    }

    // Query parameter check
    const queryVal = request.query?.workspaceId;
    if (queryVal && typeof queryVal === "string") {
      return queryVal;
    }

    // Path parameters check
    const paramVal = request.params?.workspaceId;
    if (paramVal && typeof paramVal === "string") {
      return paramVal;
    }

    return null;
  }
}
