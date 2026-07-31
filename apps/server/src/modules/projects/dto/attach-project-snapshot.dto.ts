import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class AttachProjectSnapshotDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  public readonly assetId!: string;
}
