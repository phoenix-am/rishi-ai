import { Module, OnModuleInit, Inject } from "@nestjs/common";
import { ConfigService } from "@rishi/config";
import type { ILogger } from "@rishi/logger";
import { DatabaseService } from "@rishi/database";
import {
  DrizzleCreatorRepository,
  DrizzleKnowledgeAssetRepository,
  DrizzleKnowledgeSnapshotRepository,
  DrizzleScriptBlockRepository,
  DrizzleProjectMemoryRepository,
  DrizzleProjectRepository,
} from "@rishi/database";
import {
  ProjectWorkflowService,
  CREATOR_REPOSITORY,
  KNOWLEDGE_ASSET_REPOSITORY,
  KNOWLEDGE_SNAPSHOT_REPOSITORY,
  SCRIPT_BLOCK_REPOSITORY,
  PROJECT_MEMORY_REPOSITORY,
  PROJECT_REPOSITORY,
} from "@rishi/domain";

import { DatabaseModule } from "./foundation/database/database.module.js";
import { FoundationModule } from "./foundation/foundation.module.js";
import { HealthModule } from "./foundation/health/health.module.js";
import { AuthModule } from "./modules/auth/auth.module.js";

@Module({
  imports: [
    DatabaseModule, // Exports Config, Logger, TransactionManager, DB client/service
    FoundationModule, // Registers Global Interceptor & Exception Filter
    HealthModule, // Health checks endpoint
    AuthModule,
  ],
  providers: [
    // Repository Implementations (Singleton dependency inversion adapters)
    {
      provide: CREATOR_REPOSITORY,
      useFactory: (dbService: DatabaseService) => new DrizzleCreatorRepository(dbService),
      inject: [DatabaseService],
    },
    {
      provide: KNOWLEDGE_ASSET_REPOSITORY,
      useFactory: (dbService: DatabaseService) => new DrizzleKnowledgeAssetRepository(dbService),
      inject: [DatabaseService],
    },
    {
      provide: KNOWLEDGE_SNAPSHOT_REPOSITORY,
      useFactory: (dbService: DatabaseService) => new DrizzleKnowledgeSnapshotRepository(dbService),
      inject: [DatabaseService],
    },
    {
      provide: SCRIPT_BLOCK_REPOSITORY,
      useFactory: (dbService: DatabaseService) => new DrizzleScriptBlockRepository(dbService),
      inject: [DatabaseService],
    },
    {
      provide: PROJECT_MEMORY_REPOSITORY,
      useFactory: (dbService: DatabaseService) => new DrizzleProjectMemoryRepository(dbService),
      inject: [DatabaseService],
    },
    {
      provide: PROJECT_REPOSITORY,
      useFactory: (dbService: DatabaseService) => new DrizzleProjectRepository(dbService),
      inject: [DatabaseService],
    },
    // Domain Services
    {
      provide: ProjectWorkflowService,
      useClass: ProjectWorkflowService,
    },
  ],
  exports: [
    DatabaseModule,
    CREATOR_REPOSITORY,
    KNOWLEDGE_ASSET_REPOSITORY,
    KNOWLEDGE_SNAPSHOT_REPOSITORY,
    SCRIPT_BLOCK_REPOSITORY,
    PROJECT_MEMORY_REPOSITORY,
    PROJECT_REPOSITORY,
    ProjectWorkflowService,
  ],
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
