import { ApiProperty } from "@nestjs/swagger";
import { ContentAsset } from "@rishi/domain";

export class ContentAssetResponseDto {
  @ApiProperty()
  public readonly id!: string;

  @ApiProperty()
  public readonly projectId!: string;

  @ApiProperty()
  public readonly workspaceId!: string;

  @ApiProperty()
  public readonly type!: string;

  @ApiProperty({ required: false, nullable: true })
  public readonly contentUrl!: string | null;

  @ApiProperty({ required: false, nullable: true })
  public readonly textContent!: string | null;

  @ApiProperty()
  public readonly createdAt!: Date;

  public static fromDomain(asset: ContentAsset): ContentAssetResponseDto {
    return {
      id: asset.id,
      projectId: asset.projectId,
      workspaceId: asset.workspaceId,
      type: asset.type,
      contentUrl: asset.contentUrl,
      textContent: asset.textContent,
      createdAt: asset.createdAt,
    };
  }
}
