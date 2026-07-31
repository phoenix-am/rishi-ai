import { Module } from "@nestjs/common";
import { QueueModule } from "../../../common/queue/index.js";
import { SnapshotRepository } from "./repository/snapshot.repository.js";
import { SnapshotService } from "./snapshot.service.js";

@Module({
  imports: [QueueModule],
  providers: [SnapshotRepository, SnapshotService],
  exports: [SnapshotService],
})
export class SnapshotModule {}
