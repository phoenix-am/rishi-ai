import { IsString, IsNotEmpty, IsOptional, Matches, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateCreatorDto {
  @ApiProperty({ description: "The display name of the creator", example: "John Doe" })
  @IsString({ message: "name must be a string" })
  @IsNotEmpty({ message: "name is required and cannot be empty" })
  @MaxLength(100, { message: "name must not exceed 100 characters" })
  name!: string;

  @ApiProperty({ description: "The unique handle of the creator", example: "john_doe" })
  @IsString({ message: "handle must be a string" })
  @IsNotEmpty({ message: "handle is required and cannot be empty" })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: "handle must contain only alphanumeric characters and underscores",
  })
  @MaxLength(50, { message: "handle must not exceed 50 characters" })
  handle!: string;

  @ApiPropertyOptional({
    description: "Short biography of the creator",
    example: "Vedic astrologer and history educator",
  })
  @IsOptional()
  @IsString({ message: "bio must be a string" })
  @MaxLength(500, { message: "bio must not exceed 500 characters" })
  bio?: string;

  @ApiPropertyOptional({
    description: "URL to the creator avatar image",
    example: "https://avatar.url/john.png",
  })
  @IsOptional()
  @IsString({ message: "avatarUrl must be a string" })
  avatarUrl?: string;
}
