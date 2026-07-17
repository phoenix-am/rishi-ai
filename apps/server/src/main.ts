import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module.js";
import { ConfigService, ConfigurationValidationError } from "@rishi/config";
import { ILogger } from "@rishi/logger";

async function bootstrap() {
  let configService: ConfigService;

  try {
    // Eagerly instantiate and validate environment variables
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

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  const logger = app.get<ILogger>("ILogger");
  const port = configService.get("PORT") || 3000;

  // Graceful shutdown hooks
  app.enableShutdownHooks();

  await app.listen(port, "0.0.0.0");
  logger.info(`Server successfully bootstrapped, listening on http://localhost:${port}`);
}

bootstrap().catch((err) => {
  console.error("[Fatal Exception] Failed to bootstrap NestJS application:", err);
  process.exit(1);
});
