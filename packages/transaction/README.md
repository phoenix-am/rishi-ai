# `@rishi/transaction`

Contextual execution wrapper utilizing `AsyncLocalStorage` to manage database transaction scopes.

## Responsibilities

- Houses transaction boundary orchestrators and connection propagation contexts.
- **Must never own:** Database connection configurations or physical entity repositories.

## Dependencies

- **Allowed Dependencies:** `@rishi/logger`, `@rishi/config`, `@rishi/shared`
- **Forbidden Dependencies:** All other packages.

## Public API

Exposes the `TransactionManager` and the `DrizzleTransactionClient` type token.
