# ADR-005: Authentication & Identity Foundation

| Metadata Field | Value |
| :--- | :--- |
| **Status** | APPROVED |
| **Date** | 2026-07-19 |
| **Author** | Antigravity (Principal Software Architect) |
| **Deciders** | User, Antigravity |
| **Superseded By** | N/A |

---

## 1. Context & Problem Statement

To support multi-tenancy, granular data isolation, and user management, Rishi AI requires a secure-by-default identity layer. The system must support passwordless authentication using One-Time Passwords (OTPs) sent via email, session management via HttpOnly refresh token cookies, dynamic session rotation/revocation, and guards/decorators for multi-tenant data access control.

---

## 2. Decision Driver / Requirements

- **Multi-Tenant Schema:** Database tables for users, workspaces, workspace memberships (with roles), and sessions, bound by proper database foreign keys.
- **Secure-by-Default API:** Every endpoint must be protected by default using a JWT authentication guard unless explicitly marked public.
- **Passwordless Flow:** Secure 6-digit OTP generation, hashed in-memory storage with TTL, and dispatch.
- **Atomic Registration:** Auto-creating a user, their default personal workspace, and adding them as the workspace owner must run inside a single transaction.
- **Session Lifecycle:** JWT access tokens (15m expiry, RS256 signed) and long-lived refresh tokens (7 days, SHA-256 hashed, stored in DB, set as secure HttpOnly cookie).
- **Workspace Access Control:** Enforce that a user belongs to a workspace before letting them query or edit its data.

---

## 3. Considered Options

### Option A: Standard Third-Party Identity Provider (e.g. Auth0, Clerk)
- **Description:** Delegate authentication, user schemas, and sessions to a managed service.
- **Pros:** Fast implementation, built-in security features, handles compliance.
- **Cons:** Bypasses local monorepo data control, introduces vendor lock-in, hard to customize local workspace/session propagation inside transactions.

### Option B: Local Identity Foundation & Custom Auth Module
- **Description:** Implement custom tables (`users`, `workspaces`, `workspaceMembers`, `sessions`) using Drizzle ORM, a lightweight in-memory OTP store, a NestJS `AuthApplicationService` managing session lifecycles, and global guards.
- **Pros:**
  - Full local ownership of user credentials, workspaces, and memberships.
  - Transactions for sign-ups are managed locally using `@rishi/transaction` (AsyncLocalStorage context).
  - High performance, self-contained testing, no external dependencies.
- **Cons:** Requires implementing secure cryptographic token generation and session rotation manually.

---

## 4. Final Decision & Rationale

We chose **Option B (Local Identity Foundation & Custom Auth Module)**.

Building local authentication aligns with Rishi AI's monorepo architecture, enabling tight integration between transaction managers, logging context, and database layers.

- **Identity Schema:** Implemented using Drizzle with relations mapping users to workspace memberships and sessions.
- **Passwordless Auth:** Generation of 6-digit random codes. Verification hashes input to verify against SHA-256 stored in `InMemoryOtpStore` to mitigate timing attacks.
- **Session Lifecycles:** RS256 token verification utilizes asymmetric key configuration from `@rishi/config`. Refresh tokens are stored in the database hashed with SHA-256, and cookies are set as `httpOnly`, `secure`, and `sameSite: strict`.
- **Global Guard:** `JwtAuthGuard` is registered globally as `APP_GUARD` in `AuthModule`. Every route is secure-by-default unless annotated with `@Public()`.
- **Multi-Tenant Isolation:** `WorkspaceGuard` intercepts incoming requests, resolves workspace context, and loads memberships into `request.workspace`.

---

## 5. Consequences & Trade-offs

- **Positive Impacts:**
  - Secure-by-default architecture prevents exposed API endpoints.
  - Complete control over session validation, rotation, and revocation.
  - Zero external identity network request overhead, ensuring fast response times.
- **Negative/Trade-offs:**
  - The in-memory OTP store resets on server restarts. (Mitigated by OTPs having short TTLs where persistence is unnecessary).
  - Cryptographic keys must be managed in config variables.

---

## 6. Verification & Implementation Details

- **Atomic transactions:** Uses `@rishi/transaction` context propagation to bundle user, workspace, and owner member rows.
- **Test coverage:** Complete unit and integration tests (39 tests in server package) covering `InMemoryOtpStore`, `AuthApplicationService`, `AuthController` endpoints, guards (`JwtAuthGuard`, `WorkspaceGuard`), and parameter decorators.
