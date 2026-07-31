import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, Min } from "class-validator";
import { PROJECT_STATES, type ProjectState } from "@rishi/domain";

export { PROJECT_STATES };

export class TransitionProjectStateDto {
  @ApiProperty({ enum: PROJECT_STATES })
  @IsIn(PROJECT_STATES)
  public readonly targetState!: ProjectState;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly expectedVersion!: number;
}
