import { ApiProperty } from "@nestjs/swagger";
import { Project } from "@rishi/domain";

export class ProjectResponseDto {
  @ApiProperty()
  public readonly id!: string;

  @ApiProperty()
  public readonly workspaceId!: string;

  @ApiProperty()
  public readonly name!: string;

  @ApiProperty({ required: false, nullable: true })
  public readonly description!: string | null;

  @ApiProperty()
  public readonly status!: string;

  @ApiProperty()
  public readonly createdAt!: Date;

  public static fromDomain(project: Project): ProjectResponseDto {
    return {
      id: project.id,
      workspaceId: project.workspaceId,
      name: project.name,
      description: project.description,
      status: project.status,
      createdAt: project.createdAt,
    };
  }
}
