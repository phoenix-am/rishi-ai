import { NestFastifyApplication } from "@nestjs/platform-fastify";
import { ConfigService } from "@rishi/config";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import cookie from "@fastify/cookie";

/**
 * Bootstraps security plugins for Fastify: CORS, Helmet, and Rate Limiting.
 */
export async function bootstrapSecurity(app: NestFastifyApplication): Promise<void> {
  const configService = app.get(ConfigService);
  const allowedOrigins = configService.get("ALLOWED_ORIGINS");
  const rateLimitMax = configService.get("RATE_LIMIT_MAX");
  const enableSwagger = configService.get("ENABLE_SWAGGER");
  const isProduction = configService.get("NODE_ENV") === "production";

  // 1. CORS Configuration
  await app.register(cors, {
    origin: allowedOrigins.includes(",")
      ? allowedOrigins.split(",").map((o) => o.trim())
      : allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Correlation-Id",
      "X-Request-Id",
      "traceparent",
    ],
  });

  // 2. Helmet Configuration (CSPs tailored for Swagger UI in non-prod environments)
  const bypassCspForSwagger = enableSwagger && !isProduction;
  await app.register(helmet, {
    contentSecurityPolicy: bypassCspForSwagger
      ? {
          directives: {
            defaultSrc: [`'self'`],
            styleSrc: [`'self'`, `'unsafe-inline'`],
            imgSrc: [`'self'`, "data:", "validator.swagger.io"],
            scriptSrc: [`'self'`, `'unsafe-inline'`],
          },
        }
      : true,
  });

  // 3. Rate Limiting Configuration
  await app.register(rateLimit, {
    max: rateLimitMax,
    timeWindow: "1 minute",
    errorResponseBuilder: (request, context) => {
      // Map rate limiting errors directly into the standard error envelope
      return {
        success: false,
        data: null,
        meta: {
          correlationId: request.headers["x-correlation-id"],
        },
        error: {
          code: "TOO_MANY_REQUESTS",
          message: `Rate limit exceeded. Maximum allowed is ${context.max} requests per minute.`,
          details: null,
        },
      };
    },
  });

  // 4. Cookie Configuration
  await app.register(cookie, {
    secret: configService.get("AES_MASTER_KEY"),
  });
}
