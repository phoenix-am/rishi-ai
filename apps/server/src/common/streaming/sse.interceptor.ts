import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { StreamEventDto } from "./dto/stream-event.dto.js";

/**
 * NestJS interceptor that transparently handles SSE (Server-Sent Events) stream responses.
 *
 * When a controller action returns an `Observable<StreamEventDto>` (or a compatible
 * stream), this interceptor:
 *
 * 1. Detects that the request `Accept` header is `text/event-stream`.
 * 2. Transforms each emitted `StreamEventDto` value into its W3C wire format string,
 *    ready to be consumed by an `EventSource` client.
 * 3. Passes non-SSE streams through unchanged so the global `ResponseEnvelopeInterceptor`
 *    can wrap them normally.
 *
 * ## Usage
 *
 * Apply at the controller-level or action-level with `@UseInterceptors(SseInterceptor)`.
 * Return an `Observable<StreamEventDto>` from the action decorated with `@Sse()`.
 *
 * ```ts
 * @Controller('generate')
 * @UseInterceptors(SseInterceptor)
 * export class GenerateController {
 *   @Sse('stream')
 *   stream(): Observable<MessageEvent> {
 *     return this.generationService.streamChunks().pipe(
 *       map(chunk => ({ data: StreamEventDto.chunk(chunk).toWireFormat() }))
 *     );
 *   }
 * }
 * ```
 *
 * ## Wire-format compliance
 *
 * `StreamEventDto.toWireFormat()` serialises each event per the W3C SSE specification:
 * ```
 * id: <id>\n
 * event: <event>\n
 * data: <data>\n
 * \n
 * ```
 */
@Injectable()
export class SseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const isSse = request.headers?.["accept"] === "text/event-stream";

    if (!isSse) {
      // Not an SSE request — pass through unchanged
      return next.handle();
    }

    return next.handle().pipe(
      map((event) => {
        if (event instanceof StreamEventDto) {
          // Already a StreamEventDto — return the wire-format string
          return event.toWireFormat();
        }

        // Passthrough any other value (e.g. already-formatted strings or MessageEvent)
        return event;
      })
    );
  }
}
