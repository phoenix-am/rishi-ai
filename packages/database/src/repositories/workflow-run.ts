import { IWorkflowRunRepository, WorkflowRun } from "@rishi/domain";
import { DatabaseService } from "../index.js";
import { workflowRuns } from "../schema/index.js";
import { WorkflowRunMapper } from "../mappers.js";
import { eq } from "drizzle-orm";

/**
 * WorkflowRun persistence adapter using Drizzle PostgreSQL client.
 */
export class DrizzleWorkflowRunRepository implements IWorkflowRunRepository {
  constructor(private readonly dbService: DatabaseService) {}

  /**
   * Resolves workflow run by ID.
   */
  public async findById(id: string): Promise<WorkflowRun | null> {
    const rows = await this.dbService.client
      .select()
      .from(workflowRuns)
      .where(eq(workflowRuns.id, id))
      .limit(1);

    if (rows.length === 0) return null;
    return WorkflowRunMapper.toDomain(rows[0]!);
  }

  /**
   * Saves workflow run state (insert or update).
   */
  public async save(run: WorkflowRun): Promise<void> {
    const data = WorkflowRunMapper.toPersistence(run);
    await this.dbService.client
      .insert(workflowRuns)
      .values(data)
      .onConflictDoUpdate({
        target: workflowRuns.id,
        set: {
          workflowId: data.workflowId,
          workspaceId: data.workspaceId,
          status: data.status,
          state: data.state,
          completedAt: data.completedAt,
        },
      });
  }

  /**
   * Checks if workflow run exists.
   */
  public async exists(id: string): Promise<boolean> {
    const rows = await this.dbService.client
      .select({ id: workflowRuns.id })
      .from(workflowRuns)
      .where(eq(workflowRuns.id, id))
      .limit(1);

    return rows.length > 0;
  }
}
