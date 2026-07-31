import { SetMetadata } from "@nestjs/common";

export const AUTHORIZATION_RESOURCE_KEY = "authorization:resource";

export const AUTHORIZATION_RESOURCE_TYPES = [
  "creator",
  "project",
  "knowledge-asset",
  "content-asset",
  "workflow",
  "workflow-run",
] as const;

export type AuthorizationResourceType = (typeof AUTHORIZATION_RESOURCE_TYPES)[number];

export interface AuthorizationResourceRequirement {
  readonly type: AuthorizationResourceType;
  readonly param: string;
}

export const RequireWorkspaceResource = (type: AuthorizationResourceType, param = "id") =>
  SetMetadata(AUTHORIZATION_RESOURCE_KEY, {
    type,
    param,
  } satisfies AuthorizationResourceRequirement);
