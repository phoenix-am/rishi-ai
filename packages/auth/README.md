# `@rishi/auth`

Authentication contracts, token payload interfaces, and provider tokens for Rishi AI.

| Metadata                  | Value                 |
| :------------------------ | :-------------------- |
| **Lifecycle**             | Current               |
| **Implementation Status** | Implemented           |
| **Owner**                 | Repository Maintainer |
| **Current Authority**     | Package public API    |
| **Last Verified**         | 2026-07-31            |

## Responsibilities

- Houses authentication service contracts, token/session types, and email-provider boundaries.
- **Must never own:** Auth endpoint controllers, OAuth callbacks (Google/email OTP routers), or JWT signing key vaults.

## Dependencies

The contract package has no runtime workspace dependencies.

## Public API

Provides authenticated-user and session models, OTP and Google identity inputs, authentication result types, authentication-service and token-service contracts, and the public email-provider injection token.
