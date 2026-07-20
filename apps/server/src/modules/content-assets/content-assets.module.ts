import { Module } from "@nestjs/common";
import { ContentAssetsController } from "./content-assets.controller.js";
import { ContentAssetsApplicationService } from "./services/content-assets-application.service.js";

@Module({
  controllers: [ContentAssetsController],
  providers: [ContentAssetsApplicationService],
  exports: [ContentAssetsApplicationService],
})
export class ContentAssetsModule {}
