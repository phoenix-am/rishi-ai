import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
  VERSION_NEUTRAL,
  Version,
} from "@nestjs/common";
import { DatabaseService } from "@rishi/database";

@Controller("health")
export class HealthController {
  constructor(@Inject(DatabaseService) private readonly dbService: DatabaseService) {}

  /**
   * Health check endpoint to monitor application and database availability.
   * Excluded from default API versioning (accessible Neutral/Neutral version).
   */
  @Get()
  @Version(VERSION_NEUTRAL)
  async checkHealth(): Promise<{ status: string; database: string; timestamp: string }> {
    const isDbAlive = await this.dbService.ping();

    if (!isDbAlive) {
      throw new ServiceUnavailableException("Database connectivity check failed");
    }

    return {
      status: "UP",
      database: "UP",
      timestamp: new Date().toISOString(),
    };
  }
}
