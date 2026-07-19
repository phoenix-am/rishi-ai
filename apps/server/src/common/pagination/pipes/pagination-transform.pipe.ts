import { PipeTransform, Injectable, BadRequestException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { PaginationQueryDto } from "../dto/pagination-query.dto.js";

/**
 * NestJS pipe that transforms and validates raw query-string parameters into a
 * fully typed, defaulted `PaginationQueryDto`.
 *
 * Usage — apply at the controller action level:
 *
 * ```ts
 * @Get()
 * list(@Query(new PaginationTransformPipe()) query: PaginationQueryDto) { ... }
 * ```
 *
 * The pipe performs two passes:
 * 1. **Transform** — `class-transformer` `plainToInstance` coerces string values
 *    (e.g., `"2"`) to their annotated primitive types (e.g., `number`).
 * 2. **Validate** — `class-validator` checks all `@Is*` constraints and
 *    throws a `BadRequestException` with a human-readable errors array on failure.
 */
@Injectable()
export class PaginationTransformPipe implements PipeTransform {
  async transform(value: unknown): Promise<PaginationQueryDto> {
    // Coerce raw query-string object into a typed class instance
    const dto = plainToInstance(PaginationQueryDto, value ?? {}, {
      enableImplicitConversion: true, // string "1" → number 1
    });

    // Validate decorated constraints
    const errors = await validate(dto, {
      whitelist: true, // strip unknown properties
      forbidNonWhitelisted: false, // do not throw on extra fields — just strip
    });

    if (errors.length > 0) {
      const messages = errors.flatMap((e) => (e.constraints ? Object.values(e.constraints) : []));
      throw new BadRequestException(messages);
    }

    return dto;
  }
}
