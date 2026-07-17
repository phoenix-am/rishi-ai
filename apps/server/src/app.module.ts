import { Module, OnModuleInit, Inject } from "@nestjs/common";
import { ConfigService } from "@rishi/config";
import { createDatabaseClient } from "@rishi/database";
import { LoggerFactory } from "@rishi/logger";
import type { ILogger } from "@rishi/logger";

@Module({
  providers: [
    {
      provide: ConfigService,
      useFactory: () => new ConfigService(),
    },
    {
      provide: "ILogger",
      useFactory: (configService: ConfigService) => {
        return LoggerFactory.createLogger(configService);
      },
      inject: [ConfigService],
    },
    {
      provide: "DRIZZLE_CLIENT",
      useFactory: (configService: ConfigService) => {
        return createDatabaseClient(configService);
      },
      inject: [ConfigService],
    },
  ],
  exports: [ConfigService, "ILogger", "DRIZZLE_CLIENT"],
})
export class AppModule implements OnModuleInit {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject("ILogger") private readonly logger: ILogger
  ) {}

  onModuleInit() {
    this.logger.info(
      "Application initialized in environment: " + this.configService.get("NODE_ENV")
    );
  }
}
