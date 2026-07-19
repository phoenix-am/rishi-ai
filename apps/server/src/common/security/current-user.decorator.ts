import { createParamDecorator, ExecutionContext } from "@nestjs/common";

/**
 * Parameter decorator to retrieve the authenticated user payload
 * from the active HTTP request context.
 */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
