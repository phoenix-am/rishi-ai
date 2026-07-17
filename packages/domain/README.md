# `@rishi/domain`

Contains pure domain entities, interface types, and values representing core business models of Rishi AI.

## Responsibilities

- Define interfaces for Projects, ScriptBlocks, Creators, and Chunks.
- **Must never own:** Database queries, Drizzle layouts, ORMs, NestJS components, controllers, or REST route endpoints.

## Dependencies

- **Allowed Dependencies:** `@rishi/shared`
- **Forbidden Dependencies:** All other workspace packages, NestJS, and database ORMs (e.g. Drizzle).

## Public API

Provides core typescript interface tokens.
