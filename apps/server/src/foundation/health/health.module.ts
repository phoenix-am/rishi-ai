import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller.js";

/**
 * Health check module, kept completely isolated from business domains.
 * Resolves only the DatabaseService from the global context.
 */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
