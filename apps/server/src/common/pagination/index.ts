/**
 * @module common/pagination
 *
 * Reusable pagination infrastructure for Rishi AI REST list endpoints.
 *
 * Exports:
 * - `PaginationQueryDto` — query parameter DTO with class-validator constraints
 * - `PaginationTransformPipe` — NestJS pipe that coerces and validates query params
 */

export { PaginationQueryDto } from "./dto/pagination-query.dto.js";
export { PaginationTransformPipe } from "./pipes/pagination-transform.pipe.js";
