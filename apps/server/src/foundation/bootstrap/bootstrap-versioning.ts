import { NestFastifyApplication } from "@nestjs/platform-fastify";
import { VersioningType } from "@nestjs/common";

/**
 * Configures API global routing prefix and URI-based versioning.
 */
export function bootstrapVersioning(app: NestFastifyApplication): void {
  app.setGlobalPrefix("api");
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
  });
}
