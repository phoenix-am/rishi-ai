import { IsString, IsNotEmpty, IsOptional, IsEnum } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum CreateContentAssetTypeEnum {
  SCRIPT = "SCRIPT",
  AUDIO = "AUDIO",
  VIDEO = "VIDEO",
  IMAGE = "IMAGE",
}

export class CreateContentAssetDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  public readonly projectId!: string;

  @ApiProperty({ enum: CreateContentAssetTypeEnum })
  @IsEnum(CreateContentAssetTypeEnum)
  public readonly type!: CreateContentAssetTypeEnum;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  public readonly contentUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  public readonly textContent?: string;
}
