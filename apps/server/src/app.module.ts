import { Module, OnModuleInit, Inject } from "@nestjs/common";
import { ConfigService } from "@rishi/config";
import type { ILogger } from "@rishi/logger";
import { DatabaseService } from "@rishi/database";
import { ProjectWorkflowService } from "@rishi/domain";
import { StorageModule } from "@rishi/storage";

import { DatabaseModule } from "./foundation/database/database.module.js";
import { FoundationModule } from "./foundation/foundation.module.js";
import { HealthModule } from "./foundation/health/health.module.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { CreatorsModule } from "./modules/creators/creators.module.js";
import { WorkflowsModule } from "./modules/workflows/workflows.module.js";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { AllExceptionsFilter } from "./foundation/filters/all-exceptions.filter.js";
import { LoggingInterceptor } from "./foundation/interceptors/logging.interceptor.js";

import { ProjectsModule } from "./modules/projects/projects.module.js";
import { ContentAssetsModule } from "./modules/content-assets/content-assets.module.js";
import { QueueModule } from "./common/queue/queue.module.js";
import { ParsingModule } from "./modules/knowledge/parsing/parsing.module.js";

@Module({
  imports: [
    DatabaseModule, // Exports Config, Logger, TransactionManager, DB client/service and all repositories globally
    StorageModule,
    FoundationModule, // Registers Global Interceptor & Exception Filter
    HealthModule, // Health checks endpoint
    AuthModule,
    CreatorsModule,
    WorkflowsModule,
    ProjectsModule,
    ContentAssetsModule,
    QueueModule,
    ParsingModule,
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),
  ],

  providers: [
    // Domain Services
    {
      provide: ProjectWorkflowService,
      useClass: ProjectWorkflowService,
    },
    // Global Providers
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
  exports: [DatabaseModule, ProjectWorkflowService],
})
export class AppModule implements OnModuleInit {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject("ILogger") private readonly logger: ILogger,
    @Inject(DatabaseService) private readonly dbService: DatabaseService
  ) {}

  /**
   * Startup lifecycle validation: Pings the database to verify active network connectivity.
   * Fails fast if connection is unavailable.
   */
  async onModuleInit() {
    this.logger.info(
      "Application initializing in environment: " + this.configService.get("NODE_ENV")
    );

    const isDbAlive = await this.dbService.ping();
    if (!isDbAlive) {
      this.logger.error("Fatal: Database connectivity validation failed during startup!");
      throw new Error(
        "Database startup check failed. Verify connection settings and availability."
      );
    }

    this.logger.info("Database connectivity successfully verified.");
    this.logger.info("Application successfully initialized.");
  }
}
