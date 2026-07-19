import { ApiProperty } from "@nestjs/swagger";
import { Workflow } from "@rishi/domain";

export class WorkflowResponseDto {
  @ApiProperty({ description: "The unique identifier of the workflow", example: "wf-123" })
  id!: string;

  @ApiProperty({ description: "The workspace ID this workflow belongs to", example: "ws-456" })
  workspaceId!: string;

  @ApiProperty({ description: "The name of the workflow", example: "Automated Pipeline" })
  name!: string;

  @ApiProperty({
    description: "The description of the workflow",
    nullable: true,
    example: "Generate text and audio",
  })
  description!: string | null;

  @ApiProperty({ description: "The trigger type of the workflow", example: "manual" })
  triggerType!: string;

  @ApiProperty({ description: "Graph definition containing nodes and edges" })
  definition!: any;

  @ApiProperty({ description: "The status of the workflow", example: "active" })
  status!: string;

  @ApiProperty({ description: "The creation date" })
  createdAt!: Date;

  static fromDomain(workflow: Workflow): WorkflowResponseDto {
    const dto = new WorkflowResponseDto();
    dto.id = workflow.id;
    dto.workspaceId = workflow.workspaceId;
    dto.name = workflow.name;
    dto.description = workflow.description;
    dto.triggerType = workflow.triggerType;
    dto.definition = workflow.definition;
    dto.status = workflow.status;
    dto.createdAt = workflow.createdAt;
    return dto;
  }
}
