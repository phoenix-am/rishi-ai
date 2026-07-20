import { Module } from "@nestjs/common";
import { ProjectsController } from "./projects.controller.js";
import { ProjectsApplicationService } from "./services/projects-application.service.js";

@Module({
  controllers: [ProjectsController],
  providers: [ProjectsApplicationService],
  exports: [ProjectsApplicationService],
})
export class ProjectsModule {}
