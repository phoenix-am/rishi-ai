import { ConflictException } from "@nestjs/common";

export class OptimisticLockException extends ConflictException {
  constructor(projectId: string, expectedVersion: number) {
    super({
      statusCode: 409,
      error: "Optimistic Lock Conflict",
      message: "The project was changed by another operation. Reload it and retry.",
      code: "PROJECT_VERSION_CONFLICT",
      projectId,
      expectedVersion,
    });
    this.name = "OptimisticLockException";
  }
}
