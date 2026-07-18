import { NestFastifyApplication } from "@nestjs/platform-fastify";
import { ConfigService } from "@rishi/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

/**
 * Bootstraps Swagger documentation for non-production environments.
 */
export function bootstrapSwagger(app: NestFastifyApplication): void {
  const configService = app.get(ConfigService);
  const enableSwagger = configService.get("ENABLE_SWAGGER");
  const isProduction = configService.get("NODE_ENV") === "production";

  // Prevent exposing OpenAPI swagger UI in production environment
  if (enableSwagger && !isProduction) {
    const config = new DocumentBuilder()
      .setTitle("Rishi AI API")
      .setDescription("The API documentation for Rishi AI Content Production Operating System")
      .setVersion("1.0.0")
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document);
  }
}
