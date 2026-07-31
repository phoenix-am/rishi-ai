import { Module } from "@nestjs/common";
import { ProjectsController } from "./projects.controller.js";
import { ProjectsApplicationService } from "./services/projects-application.service.js";
import { AuthorizationModule } from "../../common/security/authorization.module.js";

@Module({
  imports: [AuthorizationModule],
  controllers: [ProjectsController],
  providers: [ProjectsApplicationService],
  exports: [ProjectsApplicationService],
})
export class ProjectsModule {}
