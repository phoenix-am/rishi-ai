import { IsString, IsOptional, MaxLength, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { WorkflowDefinitionDto } from "./create-workflow.dto.js";

export class UpdateWorkflowDto {
  @ApiPropertyOptional({ description: "The name of the workflow", example: "Updated Pipeline" })
  @IsOptional()
  @IsString({ message: "name must be a string" })
  @MaxLength(100, { message: "name must not exceed 100 characters" })
  name?: string;

  @ApiPropertyOptional({ description: "A detailed description of the workflow" })
  @IsOptional()
  @IsString({ message: "description must be a string" })
  @MaxLength(500, { message: "description must not exceed 500 characters" })
  description?: string;

  @ApiPropertyOptional({ description: "The trigger type of the workflow" })
  @IsOptional()
  @IsString({ message: "triggerType must be a string" })
  triggerType?: string;

  @ApiPropertyOptional({
    type: WorkflowDefinitionDto,
    description: "Graph definition containing nodes and edges",
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkflowDefinitionDto)
  definition?: WorkflowDefinitionDto;

  @ApiPropertyOptional({ description: "The status of the workflow", example: "active" })
  @IsOptional()
  @IsString({ message: "status must be a string" })
  status?: string;
}
