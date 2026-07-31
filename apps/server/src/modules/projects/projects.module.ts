import { Module } from "@nestjs/common";
import { ProjectsController } from "./projects.controller.js";
import { ProjectsApplicationService } from "./services/projects-application.service.js";
import { AuthorizationModule } from "../../common/security/authorization.module.js";
import { SnapshotModule } from "../knowledge/snapshot/index.js";

@Module({
  imports: [AuthorizationModule, SnapshotModule],
  controllers: [ProjectsController],
  providers: [ProjectsApplicationService],
  exports: [ProjectsApplicationService],
})
export class ProjectsModule {}
