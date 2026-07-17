# `@rishi/shared`

Universal utilities, error models, and standard helpers for Rishi AI.

## Responsibilities

- Houses basic type guards, universally used constants, and base custom exception models.
- **Must never own:** Business rules, schemas, controllers, or database ORM models.

## Dependencies

- **Allowed Dependencies:** None (isolated leaf package).
- **Forbidden Dependencies:** All packages (`@rishi/*`), frameworks, and database drivers.

## Public API

Exposes pure JS/TS validation functions and custom error models.
