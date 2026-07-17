# `@rishi/auth`

Stateless authentication contracts, token payload interfaces, and authorization types for Rishi AI.

## Responsibilities

- Houses token verification schemas, session contexts, and user profile interfaces.
- **Must never own:** Auth endpoint controllers, OAuth callbacks (Google/email OTP routers), or JWT signing key vaults.

## Dependencies

- **Allowed Dependencies:** `@rishi/domain`, `@rishi/shared`
- **Forbidden Dependencies:** All other workspace packages.

## Public API

Provides session data models and token management interfaces.
