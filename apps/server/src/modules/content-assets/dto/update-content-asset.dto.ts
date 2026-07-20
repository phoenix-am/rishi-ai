import { IsString, IsOptional } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateContentAssetDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  public readonly contentUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  public readonly textContent?: string;
}
