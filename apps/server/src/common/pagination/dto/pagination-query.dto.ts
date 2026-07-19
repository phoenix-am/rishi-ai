import { IsInt, IsOptional, IsString, IsIn, Min, Max } from "class-validator";
import { Type } from "class-transformer";

/**
 * Standard query-parameter DTO for paginated list endpoints.
 *
 * Attach to a controller parameter with `@Query()` and pipe through
 * `PaginationTransformPipe` for validated, defaulted values.
 *
 * @example
 * ```ts
 * @Get()
 * list(@Query(PaginationTransformPipe) query: PaginationQueryDto) { ... }
 * ```
 */
export class PaginationQueryDto {
  /**
   * Page number (1-based).
   * @default 1
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "page must be an integer" })
  @Min(1, { message: "page must be at least 1" })
  page: number = 1;

  /**
   * Maximum number of records to return per page.
   * @default 20
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "limit must be an integer" })
  @Min(1, { message: "limit must be at least 1" })
  @Max(100, { message: "limit must not exceed 100" })
  limit: number = 20;

  /**
   * Field name to sort results by.
   * Individual controllers should validate this against their entity fields.
   */
  @IsOptional()
  @IsString({ message: "sortBy must be a string" })
  sortBy?: string;

  /**
   * Sort direction.
   * @default "asc"
   */
  @IsOptional()
  @IsIn(["asc", "desc"], { message: "sortOrder must be 'asc' or 'desc'" })
  sortOrder: "asc" | "desc" = "asc";
}
