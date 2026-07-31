import { IsIn, IsString, IsOptional } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import type { ProjectState } from "@rishi/domain";
import { PROJECT_STATES } from "./transition-project-state.dto.js";

export class UpdateProjectDto {
  @ApiPropertyOptional({ example: "Updated Name" })
  @IsString()
  @IsOptional()
  public readonly name?: string;

  @ApiPropertyOptional({ example: "Updated Description" })
  @IsString()
  @IsOptional()
  public readonly description?: string;

  @ApiPropertyOptional({ enum: PROJECT_STATES })
  @IsIn(PROJECT_STATES)
  @IsOptional()
  public readonly status?: ProjectState;
}
