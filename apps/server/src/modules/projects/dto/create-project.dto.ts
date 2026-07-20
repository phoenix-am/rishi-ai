import { IsString, IsNotEmpty, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateProjectDto {
  @ApiProperty({ example: "My Project", description: "The name of the project" })
  @IsString()
  @IsNotEmpty()
  public readonly name!: string;

  @ApiPropertyOptional({ example: "A test project", description: "Project description" })
  @IsString()
  @IsOptional()
  public readonly description?: string;
}
