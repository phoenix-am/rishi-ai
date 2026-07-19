import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  ValidateNested,
  IsArray,
  IsObject,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class WorkflowNodeDto {
  @ApiProperty({ description: "Unique identifier for the node", example: "node-1" })
  @IsString({ message: "node id must be a string" })
  @IsNotEmpty({ message: "node id is required" })
  id!: string;

  @ApiProperty({ description: "Type of the node", example: "LLM_PROMPT" })
  @IsString({ message: "node type must be a string" })
  @IsNotEmpty({ message: "node type is required" })
  type!: string;

  @ApiProperty({ description: "Display name of the node", example: "Generate Script" })
  @IsString({ message: "node name must be a string" })
  @IsNotEmpty({ message: "node name is required" })
  name!: string;

  @ApiProperty({
    description: "Configuration parameters for this node",
    example: { model: "gemini" },
  })
  @IsObject({ message: "node config must be an object" })
  config!: Record<string, any>;

  @ApiProperty({ description: "List of next node IDs", example: ["node-2"] })
  @IsArray({ message: "nextNodeIds must be an array" })
  @IsString({ each: true, message: "each nextNodeId must be a string" })
  nextNodeIds!: string[];
}

export class WorkflowEdgeDto {
  @ApiProperty({ description: "Source node ID", example: "node-1" })
  @IsString({ message: "edge from must be a string" })
  @IsNotEmpty({ message: "edge from is required" })
  from!: string;

  @ApiProperty({ description: "Target node ID", example: "node-2" })
  @IsString({ message: "edge to must be a string" })
  @IsNotEmpty({ message: "edge to is required" })
  to!: string;
}

export class WorkflowDefinitionDto {
  @ApiProperty({ type: [WorkflowNodeDto], description: "List of workflow nodes" })
  @IsArray({ message: "nodes must be an array" })
  @ValidateNested({ each: true })
  @Type(() => WorkflowNodeDto)
  nodes!: WorkflowNodeDto[];

  @ApiProperty({ type: [WorkflowEdgeDto], description: "List of connections between nodes" })
  @IsArray({ message: "edges must be an array" })
  @ValidateNested({ each: true })
  @Type(() => WorkflowEdgeDto)
  edges!: WorkflowEdgeDto[];
}

export class CreateWorkflowDto {
  @ApiProperty({ description: "The name of the workflow", example: "My Content Pipeline" })
  @IsString({ message: "name must be a string" })
  @IsNotEmpty({ message: "name is required" })
  @MaxLength(100, { message: "name must not exceed 100 characters" })
  name!: string;

  @ApiPropertyOptional({
    description: "A detailed description of the workflow",
    example: "Generate text and media files",
  })
  @IsOptional()
  @IsString({ message: "description must be a string" })
  @MaxLength(500, { message: "description must not exceed 500 characters" })
  description?: string;

  @ApiProperty({ description: "The event or action that triggers the workflow", example: "manual" })
  @IsString({ message: "triggerType must be a string" })
  @IsNotEmpty({ message: "triggerType is required" })
  triggerType!: string;

  @ApiProperty({
    type: WorkflowDefinitionDto,
    description: "Graph definition containing nodes and edges",
  })
  @IsNotEmpty({ message: "definition is required" })
  @ValidateNested()
  @Type(() => WorkflowDefinitionDto)
  definition!: WorkflowDefinitionDto;
}
