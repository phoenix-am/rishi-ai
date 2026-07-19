/**
 * @module common/api
 *
 * Reusable API infrastructure for the Rishi AI server.
 *
 * Exports:
 * - `ApiResponseDto` — generic success response envelope
 * - `PaginatedResponseDto` — paginated success envelope with computed meta
 * - `PaginationMeta` — pagination metadata interface
 * - `ApiExceptionFilter` — catch-all exception filter producing `ApiErrorResponseDto`
 * - `ApiErrorResponseDto` — unified error envelope interface
 */

export { ApiResponseDto, PaginatedResponseDto } from "./dto/api-response.dto.js";
export type { PaginationMeta } from "./dto/api-response.dto.js";
export { ApiExceptionFilter } from "./filters/api-exception.filter.js";
export type { ApiErrorResponseDto } from "./filters/api-exception.filter.js";
