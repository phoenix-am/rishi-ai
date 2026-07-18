import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { RequestContext } from "../context/request.context.js";

export interface SuccessResponseDto<T> {
  success: true;
  data: T;
  meta: {
    correlationId?: string;
  };
  error: null;
}

/**
 * Global interceptor mapping all successful API controller return values
 * into a standardized envelope.
 */
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const response = httpContext.getResponse();

    return next.handle().pipe(
      map((data) => {
        // 1. Bypass response envelope logic if it is already wrapped
        if (data && typeof data === "object" && "success" in data && "meta" in data) {
          return data;
        }

        // 2. Bypass envelope formatting for SSE and direct streaming responses
        const isSse =
          request.headers.accept === "text/event-stream" ||
          response.getHeader?.("content-type") === "text/event-stream";

        if (isSse) {
          return data;
        }

        // 3. Wrap success response in envelope
        const correlationId = RequestContext.getCorrelationId();
        const envelopedResponse: SuccessResponseDto<any> = {
          success: true,
          data: data ?? null,
          meta: {
            correlationId,
          },
          error: null,
        };

        return envelopedResponse;
      })
    );
  }
}
