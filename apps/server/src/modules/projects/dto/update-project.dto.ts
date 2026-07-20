import { IsString, IsOptional } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateProjectDto {
  @ApiPropertyOptional({ example: "Updated Name" })
  @IsString()
  @IsOptional()
  public readonly name?: string;

  @ApiPropertyOptional({ example: "Updated Description" })
  @IsString()
  @IsOptional()
  public readonly description?: string;

  @ApiPropertyOptional({ example: "active" })
  @IsString()
  @IsOptional()
  public readonly status?: string;
}
