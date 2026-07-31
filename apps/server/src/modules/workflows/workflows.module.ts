import { Module } from "@nestjs/common";
import { AiModule } from "../../foundation/ai/ai.module.js";
import { WorkflowsController } from "./workflows.controller.js";
import { WorkflowsService } from "./services/workflows.service.js";
import { WorkflowEngineService } from "./services/workflow-engine.service.js";
import { ContentAssetsModule } from "../content-assets/content-assets.module.js";
import { AuthorizationModule } from "../../common/security/authorization.module.js";

@Module({
  imports: [AiModule, ContentAssetsModule, AuthorizationModule],
  controllers: [WorkflowsController],
  providers: [WorkflowsService, WorkflowEngineService],
  exports: [WorkflowsService, WorkflowEngineService],
})
export class WorkflowsModule {}
