import { Inject, Injectable } from "@nestjs/common";
import { DatabaseService, queueDeadLetters } from "@rishi/database";

export interface DeadLetterRecord {
  queueJobId: string;
  taskName: string;
  payload: unknown;
  errorName: string;
  errorMessage: string;
  attempts: number;
}

@Injectable()
export class DeadLetterService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async record(record: DeadLetterRecord): Promise<void> {
    await this.database.client
      .insert(queueDeadLetters)
      .values(record)
      .onConflictDoNothing({ target: queueDeadLetters.queueJobId });
  }
}
