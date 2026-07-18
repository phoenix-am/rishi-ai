import { Module, Global } from "@nestjs/common";
import { ConfigService } from "@rishi/config";
import { TransactionManager } from "@rishi/transaction";
import { createDatabaseClient, DatabaseService } from "@rishi/database";
import { LoggerFactory } from "@rishi/logger";
import { RequestContext } from "../context/request.context.js";

/**
 * Global database module providing core database connectivity, logger instances,
 * transaction manager instances, and configuration service instances.
 */
@Global()
@Module({
  providers: [
    // 1. Config Service
    {
      provide: ConfigService,
      useFactory: () => new ConfigService(),
    },
    // 2. Logger Service (attaches RequestContext correlation ID callback)
    {
      provide: "ILogger",
      useFactory: (configService: ConfigService) => {
        return LoggerFactory.createLogger(configService, () => RequestContext.getCorrelationId());
      },
      inject: [ConfigService],
    },
    // 3. Transaction Manager
    {
      provide: TransactionManager,
      useFactory: () => new TransactionManager(),
    },
    // 4. Raw Drizzle Database Client Pool
    {
      provide: "DRIZZLE_CLIENT",
      useFactory: (configService: ConfigService) => {
        return createDatabaseClient(configService);
      },
      inject: [ConfigService],
    },
    // 5. Database Service wrapper
    {
      provide: DatabaseService,
      useFactory: (drizzleClient: { pool: any; db: any }, txManager: TransactionManager) => {
        return new DatabaseService(drizzleClient.pool, drizzleClient.db, txManager);
      },
      inject: ["DRIZZLE_CLIENT", TransactionManager],
    },
  ],
  exports: [ConfigService, "ILogger", TransactionManager, "DRIZZLE_CLIENT", DatabaseService],
})
export class DatabaseModule {}
