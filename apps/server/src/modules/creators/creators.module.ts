import { Module } from "@nestjs/common";
import { CreatorsController } from "./creators.controller.js";
import { CreatorsApplicationService } from "./services/creators-application.service.js";
import { AuthorizationModule } from "../../common/security/authorization.module.js";

@Module({
  imports: [AuthorizationModule],
  controllers: [CreatorsController],
  providers: [CreatorsApplicationService],
  exports: [CreatorsApplicationService],
})
export class CreatorsModule {}
