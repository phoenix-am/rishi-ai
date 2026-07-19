import { IWorkflowRepository, Workflow } from "@rishi/domain";
import { DatabaseService } from "../index.js";
import { workflows } from "../schema/index.js";
import { WorkflowMapper } from "../mappers.js";
import { eq } from "drizzle-orm";

/**
 * Workflow persistence adapter using Drizzle PostgreSQL client.
 */
export class DrizzleWorkflowRepository implements IWorkflowRepository {
  constructor(private readonly dbService: DatabaseService) {}

  /**
   * Resolves workflow by ID.
   */
  public async findById(id: string): Promise<Workflow | null> {
    const rows = await this.dbService.client
      .select()
      .from(workflows)
      .where(eq(workflows.id, id))
      .limit(1);

    if (rows.length === 0) return null;
    return WorkflowMapper.toDomain(rows[0]!);
  }

  /**
   * Saves workflow state (insert or update).
   */
  public async save(workflow: Workflow): Promise<void> {
    const data = WorkflowMapper.toPersistence(workflow);
    await this.dbService.client
      .insert(workflows)
      .values(data)
      .onConflictDoUpdate({
        target: workflows.id,
        set: {
          workspaceId: data.workspaceId,
          name: data.name,
          description: data.description,
          triggerType: data.triggerType,
          definition: data.definition,
          status: data.status,
        },
      });
  }

  /**
   * Deletes workflow by ID.
   */
  public async delete(id: string): Promise<void> {
    await this.dbService.client.delete(workflows).where(eq(workflows.id, id));
  }

  /**
   * Checks if workflow exists.
   */
  public async exists(id: string): Promise<boolean> {
    const rows = await this.dbService.client
      .select({ id: workflows.id })
      .from(workflows)
      .where(eq(workflows.id, id))
      .limit(1);

    return rows.length > 0;
  }
}
