import { ApiProperty } from "@nestjs/swagger";
import { Project } from "@rishi/domain";
import type { ProjectState } from "@rishi/domain";

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
  public readonly status!: ProjectState;

  @ApiProperty({ minimum: 1 })
  public readonly version!: number;

  @ApiProperty({ required: false, nullable: true })
  public readonly previousState!: Exclude<ProjectState, "archived"> | null;

  @ApiProperty()
  public readonly hasStateDrift!: boolean;

  @ApiProperty()
  public readonly createdAt!: Date;

  @ApiProperty()
  public readonly updatedAt!: Date;

  public static fromDomain(project: Project): ProjectResponseDto {
    return {
      id: project.id,
      workspaceId: project.workspaceId,
      name: project.name,
      description: project.description,
      status: project.status,
      version: project.version,
      previousState: project.previousState,
      hasStateDrift: project.hasStateDrift,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }
}
