# `@rishi/events`

Shared event types and payload definitions representing state updates across modules.

## Responsibilities

- Define data envelopes and structures for domain-level events.
- **Must never own:** Event bus emitters (NestJS EventEmitter), event queue servers, or SQL outbox processing drivers.

## Dependencies

- **Allowed Dependencies:** `@rishi/domain`, `@rishi/shared`
- **Forbidden Dependencies:** All other packages, databases, and background queue processors.

## Public API

Provides event interfaces used for module communications.
