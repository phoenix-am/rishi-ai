import { applyDecorators, Type } from "@nestjs/common";
import { ApiExtraModels, ApiResponse, getSchemaPath } from "@nestjs/swagger";
import { ApiResponseDto } from "../api/dto/api-response.dto.js";
import { PaginatedResponseDto } from "../api/dto/api-response.dto.js";

/**
 * Composed decorator that documents a standard (non-paginated) success response.
 *
 * Attaches the `ApiResponseDto<T>` envelope schema to the Swagger operation,
 * eliminating boilerplate `@ApiResponse` + `@ApiExtraModels` from every controller.
 *
 * @example
 * ```ts
 * @Get(':id')
 * @ApiStandardResponse(CreatorDto)
 * findOne(@Param('id') id: string) { ... }
 * ```
 */
export function ApiStandardResponse<T extends Type<unknown>>(
  dataType: T,
  options: { description?: string; status?: number } = {}
) {
  const { description = "Successful operation", status = 200 } = options;

  return applyDecorators(
    ApiExtraModels(ApiResponseDto, dataType),
    ApiResponse({
      status,
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponseDto) },
          {
            properties: {
              data: { $ref: getSchemaPath(dataType) },
              success: { type: "boolean", example: true },
              error: { nullable: true, type: "object", example: null },
            },
          },
        ],
      },
    })
  );
}

/**
 * Composed decorator that documents a paginated success response.
 *
 * Attaches the `PaginatedResponseDto<T>` envelope schema — including the full
 * `PaginationMeta` shape — to the Swagger operation.
 *
 * @example
 * ```ts
 * @Get()
 * @ApiPaginatedResponse(CreatorDto)
 * list(@Query(new PaginationTransformPipe()) query: PaginationQueryDto) { ... }
 * ```
 */
export function ApiPaginatedResponse<T extends Type<unknown>>(
  dataType: T,
  options: { description?: string } = {}
) {
  const { description = "Paginated list of results" } = options;

  return applyDecorators(
    ApiExtraModels(PaginatedResponseDto, dataType),
    ApiResponse({
      status: 200,
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(PaginatedResponseDto) },
          {
            properties: {
              data: {
                type: "array",
                items: { $ref: getSchemaPath(dataType) },
              },
              success: { type: "boolean", example: true },
              error: { nullable: true, type: "object", example: null },
              meta: {
                type: "object",
                description: "Pagination metadata",
                properties: {
                  page: { type: "integer", example: 1 },
                  limit: { type: "integer", example: 20 },
                  total: { type: "integer", example: 100 },
                  totalPages: { type: "integer", example: 5 },
                  hasNextPage: { type: "boolean", example: true },
                  hasPrevPage: { type: "boolean", example: false },
                },
              },
            },
          },
        ],
      },
    })
  );
}
