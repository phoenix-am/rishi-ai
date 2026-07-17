# `apps/server`

The backend application bootstrap shell using NestJS and the Fastify adapter.

## Responsibilities

- Eager configuration validations and process bootstrap control.
- Expose NestJS dependency injection context resolving `@rishi/database`, `@rishi/logger`, and `@rishi/config`.
- **Must never own:** Business services, routers, API controllers, or ORM schemas during the initialization phase.

## Dependencies

- `@rishi/config`
- `@rishi/database`
- `@rishi/domain`
- `@rishi/events`
- `@rishi/logger`
- `@rishi/shared`
- `@nestjs/common`
- `@nestjs/core`
- `@nestjs/platform-fastify`
- `fastify`

## Public API

The main entry point is `src/main.ts` which runs the Fastify bootstrap cycle.
