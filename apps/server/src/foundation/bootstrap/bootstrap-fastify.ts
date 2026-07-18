import { NestFastifyApplication } from "@nestjs/platform-fastify";
import type { ILogger } from "@rishi/logger";
import { RequestContext } from "../context/request.context.js";
import { randomUUID } from "crypto";

/**
 * Bootstraps Fastify-specific lifecycle hooks and configurations.
 * Handles correlation ID propagation and request/response logging.
 */
export function bootstrapFastify(app: NestFastifyApplication): void {
  const logger = app.get<ILogger>("ILogger");
  const fastifyInstance = app.getHttpAdapter().getInstance();

  // 1. onRequest Hook: Extract trace/correlation ID, propagate to headers, and initialize ALS context
  fastifyInstance.addHook("onRequest", (request, reply, done) => {
    const headers = request.headers;
    let correlationId: string | undefined;

    // Check W3C traceparent header: version-traceid-parentid-traceflags
    const traceparent = headers["traceparent"];
    if (typeof traceparent === "string") {
      const parts = traceparent.split("-");
      if (parts.length >= 4 && parts[1]) {
        correlationId = parts[1];
      }
    }

    // Fallback to standard correlation/request headers
    if (!correlationId) {
      const headerVal = headers["x-correlation-id"] || headers["x-request-id"];
      if (typeof headerVal === "string") {
        correlationId = headerVal;
      } else if (Array.isArray(headerVal) && headerVal[0]) {
        correlationId = headerVal[0];
      }
    }

    // Ultimate fallback: generate a new trace ID
    if (!correlationId) {
      correlationId = randomUUID();
    }

    // Bind correlation ID header to response
    reply.header("x-correlation-id", correlationId);

    // Bind request to AsyncLocalStorage scope
    RequestContext.run({ correlationId }, () => {
      done();
    });
  });

  // 2. onResponse Hook: Log request completions and execution times
  fastifyInstance.addHook("onResponse", (request, reply, done) => {
    const duration = reply.elapsedTime; // Fastify native response duration tracking
    const method = request.method;
    const url = request.url;
    const statusCode = reply.statusCode;

    logger.info(`Request completed: ${method} ${url} - ${statusCode} (${duration.toFixed(2)}ms)`, {
      method,
      url,
      statusCode,
      durationMs: duration,
    });
    done();
  });
}
