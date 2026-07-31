import { Module } from "@nestjs/common";
import { AuthorizationService } from "./authorization.service.js";
import { ResourceOwnershipGuard } from "./resource-ownership.guard.js";

@Module({
  providers: [AuthorizationService, ResourceOwnershipGuard],
  exports: [AuthorizationService, ResourceOwnershipGuard],
})
export class AuthorizationModule {}
