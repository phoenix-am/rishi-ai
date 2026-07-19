import { createParamDecorator, ExecutionContext } from "@nestjs/common";

/**
 * Parameter decorator to retrieve the active workspace context
 * from the active HTTP request context.
 */
export const CurrentWorkspace = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.workspace;
});
