import { Module } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";
import { run } from "graphile-worker";
import { AdvisoryLockService } from "./locks/advisory-lock.service.js";
import { QueueExplorer } from "./explorer/queue.explorer.js";
import { DeadLetterService } from "./dead-letter.service.js";
import { QueueService } from "./queue.service.js";
import { QUEUE_RUNNER_FACTORY, QUEUE_SERVICE } from "./queue.contracts.js";

@Module({
  imports: [DiscoveryModule],
  providers: [
    QueueExplorer,
    DeadLetterService,
    AdvisoryLockService,
    QueueService,
    { provide: QUEUE_SERVICE, useExisting: QueueService },
    { provide: QUEUE_RUNNER_FACTORY, useValue: run },
  ],
  exports: [QUEUE_SERVICE, QueueService, AdvisoryLockService],
})
export class QueueModule {}
