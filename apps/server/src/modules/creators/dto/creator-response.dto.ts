import { ApiProperty } from "@nestjs/swagger";
import { Creator } from "@rishi/domain";

export class CreatorResponseDto {
  @ApiProperty({
    description: "The unique identifier of the creator",
    example: "d3b07384-d113-4ec6-a5d7-ecf97e2893d5",
  })
  id!: string;

  @ApiProperty({
    description: "The workspace ID this creator belongs to",
    example: "d3b07384-d113-4ec6-a5d7-ecf97e2893d5",
  })
  workspaceId!: string;

  @ApiProperty({ description: "The name of the creator", example: "John Doe" })
  name!: string;

  @ApiProperty({ description: "The unique handle of the creator", example: "john_doe" })
  handle!: string;

  @ApiProperty({
    description: "The biography of the creator",
    example: "Vedic astrologer",
    nullable: true,
  })
  bio!: string | null;

  @ApiProperty({
    description: "The avatar image URL of the creator",
    example: "https://avatar.url/john.png",
    nullable: true,
  })
  avatarUrl!: string | null;

  @ApiProperty({ description: "The creation date", example: "2026-07-16T12:00:00Z" })
  createdAt!: Date;

  static fromDomain(creator: Creator): CreatorResponseDto {
    const dto = new CreatorResponseDto();
    dto.id = creator.id;
    dto.workspaceId = creator.workspaceId;
    dto.name = creator.name;
    dto.handle = creator.handle;
    dto.bio = creator.bio;
    dto.avatarUrl = creator.avatarUrl;
    dto.createdAt = creator.createdAt;
    return dto;
  }
}
