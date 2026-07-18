import { Module } from "@nestjs/common";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { GlobalExceptionFilter } from "./filters/exception.filter.js";
import { ResponseEnvelopeInterceptor } from "./interceptors/response.interceptor.js";

/**
 * Dedicated module encapsulating application-layer cross-cutting infrastructure concerns.
 * Provides the global exception filter and response envelope interceptor.
 */
@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseEnvelopeInterceptor,
    },
  ],
})
export class FoundationModule {}
