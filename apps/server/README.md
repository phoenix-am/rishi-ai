# `apps/server`

The NestJS 11 and Fastify server application for Rishi AI.

## Current Responsibility

- Bootstrap configuration, logging, database access, validation, security, API versioning, Swagger, request context, response envelopes, and exception handling.
- Implement passwordless OTP and Google OAuth authentication, RS256 access tokens, refresh-session rotation, and workspace authorization.
- Expose creator, project, content-asset, workflow-definition, and workflow-run APIs.
- Host AI provider adapters and workflow lifecycle streaming.
- Compose domain and infrastructure packages through NestJS dependency injection.

The complete customer production workflow is not yet connected. Workflow-run creation persists a run but does not currently guarantee execution through the workflow engine.

## Boundaries

- Reuse public APIs from `@rishi/*` packages.
- Keep persistence schemas and repositories in `@rishi/database`.
- Keep framework-independent domain contracts in `@rishi/domain`.
- Enforce authentication, workspace isolation, validation, and secret-safe logging at application boundaries.

See [CURRENT_STATE.md](../../.docs/CURRENT_STATE.md) for verified capability status.

## Entry Point

`src/main.ts` starts the application. `src/app.module.ts` is the application composition root.

## Authentication Configuration

Production authentication requires an SMTP provider for OTP delivery. Google OAuth is optional and fails closed unless it is explicitly enabled with complete client and callback configuration. Example variable names and safe placeholders are documented in the root `.env.example`; credentials must never be committed or logged.
