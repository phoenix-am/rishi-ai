import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module.js";
import { ConfigService, ConfigurationValidationError } from "@rishi/config";
import type { ILogger } from "@rishi/logger";

// Import modularized bootstrap functions
import { bootstrapFastify } from "./foundation/bootstrap/bootstrap-fastify.js";
import { bootstrapSecurity } from "./foundation/bootstrap/bootstrap-security.js";
import { bootstrapSwagger } from "./foundation/bootstrap/bootstrap-swagger.js";
import { bootstrapVersioning } from "./foundation/bootstrap/bootstrap-versioning.js";

async function bootstrap() {
  let configService: ConfigService;

  try {
    // Eagerly instantiate and validate environment variables at startup
    configService = new ConfigService();
  } catch (error) {
    if (error instanceof ConfigurationValidationError) {
      console.error("[Fatal Startup Exception] Environment configuration is invalid:");
      console.error(JSON.stringify(error.errors, null, 2));
    } else {
      console.error("[Fatal Startup Exception] Unexpected error during config loading:", error);
    }
    process.exit(1);
  }

  const bodyLimit = configService.get("BODY_LIMIT_BYTES");

  // Instantiate application container using Fastify adapter
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ bodyLimit })
  );

  // 1. Configure routing global prefixing and URI versioning
  bootstrapVersioning(app);

  // 2. Configure Fastify engine details (Correlation ID propagation + structured request logging)
  bootstrapFastify(app);

  // 3. Register security plugins (CORS, Helmet, Rate limiting)
  await bootstrapSecurity(app);

  // 4. Setup Swagger UI integration (disabled in production environment)
  bootstrapSwagger(app);

  const logger = app.get<ILogger>("ILogger");
  const port = configService.get("PORT") || 3000;

  // Enable graceful shutdown cleanup listeners
  app.enableShutdownHooks();

  await app.listen(port, "0.0.0.0");
  logger.info(`Server successfully bootstrapped, listening on http://localhost:${port}`);
}

bootstrap().catch((err) => {
  console.error("[Fatal Exception] Failed to bootstrap NestJS application:", err);
  process.exit(1);
});
