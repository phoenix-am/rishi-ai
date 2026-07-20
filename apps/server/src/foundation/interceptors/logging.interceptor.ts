import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { FastifyRequest, FastifyReply } from "fastify";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<FastifyRequest>();
    const method = req.method;
    const url = req.url;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const res = ctx.getResponse<FastifyReply>();
        const delay = Date.now() - now;
        console.log(`[HTTP] ${method} ${url} - ${res.statusCode} - ${delay}ms`);
      })
    );
  }
}
