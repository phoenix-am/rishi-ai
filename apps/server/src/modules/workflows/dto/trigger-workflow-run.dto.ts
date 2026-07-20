import { IsObject, IsOptional, IsString, IsUUID } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * DTO for triggering a new workflow run.
 * Accepts workflow inputs and an optional projectId to link
 * generated content assets to a specific project on completion.
 */
export class TriggerWorkflowRunDto {
  @ApiProperty({
    description: "Key-value map of inputs to supply to the workflow execution",
    example: { topic: "history of quantum computing" },
  })
  @IsObject()
  public readonly inputs!: Record<string, any>;

  @ApiPropertyOptional({
    description:
      "Optional project ID to auto-save generated content assets into on workflow completion",
    example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  })
  @IsOptional()
  @IsString()
  @IsUUID("4")
  public readonly projectId?: string;
}
