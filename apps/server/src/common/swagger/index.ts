/**
 * @module common/swagger
 *
 * Composed OpenAPI/Swagger decorators for Rishi AI REST controllers.
 *
 * Exports:
 * - `@ApiStandardResponse(Type)` — documents a `ApiResponseDto<T>` success envelope
 * - `@ApiPaginatedResponse(Type)` — documents a `PaginatedResponseDto<T>` envelope
 *   with full pagination metadata schema
 */

export { ApiStandardResponse, ApiPaginatedResponse } from "./api-response.decorators.js";
