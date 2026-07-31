import { Inject, Injectable } from "@nestjs/common";
import { DatabaseService } from "@rishi/database";
import { TransactionManager } from "@rishi/transaction";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { AdvisoryLockContextException } from "../queue.errors.js";

export interface IAdvisoryLockService {
  tryAcquireLock(keyUuid: string): Promise<boolean>;
}

@Injectable()
export class AdvisoryLockService implements IAdvisoryLockService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(TransactionManager) private readonly transactions: TransactionManager
  ) {}

  async tryAcquireLock(keyUuid: string): Promise<boolean> {
    const validatedKey = z.string().uuid().parse(keyUuid);
    if (!this.transactions.isWithinTransaction()) {
      throw new AdvisoryLockContextException();
    }

    const result = await this.database.client.execute(
      sql`SELECT pg_try_advisory_xact_lock(hashtextextended(${validatedKey}, 0)) AS acquired`
    );
    const row = (result as unknown as { rows: Array<{ acquired: boolean }> }).rows[0];
    return row?.acquired === true;
  }
}
