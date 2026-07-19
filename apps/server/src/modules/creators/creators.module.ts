import { Module } from "@nestjs/common";
import { CreatorsController } from "./creators.controller.js";
import { CreatorsApplicationService } from "./services/creators-application.service.js";

@Module({
  controllers: [CreatorsController],
  providers: [CreatorsApplicationService],
  exports: [CreatorsApplicationService],
})
export class CreatorsModule {}
