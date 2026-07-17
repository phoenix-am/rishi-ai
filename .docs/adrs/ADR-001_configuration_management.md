# ADR-001: Configuration Management Strategy

| Metadata Field | Value |
| :--- | :--- |
| **Status** | APPROVED |
| **Date** | 2026-07-17 |
| **Author** | Antigravity (Principal Software Architect) |
| **Deciders** | User, Antigravity |
| **Superseded By** | N/A |

---

## 1. Context & Problem Statement

At system startup, the NestJS monorepo requires validating environment parameters to prevent misconfigured runtimes. In addition, downstream packages require immutable access to config parameters without runtime mutation risks. We need a system validation contract that enforces strict schema boundaries on only the required foundation environment variables for this phase (`NODE_ENV`, `PORT`, `DATABASE_URL`, and `LOG_LEVEL`), bubbles up errors via a custom `ConfigurationValidationError` without calling `process.exit(1)`, and allows easy dependency injection in NestJS modules.

---

## 2. Decision Driver / Requirements

- **Strict Schema Isolation:** Phase 2 should only capture active variables and reject AI, feature flag, or security keys.
- **Fail-Fast & Process Safety:** Validation errors must bubble up to the entrypoint module (`apps/server/src/main.ts`) so it can log and exit gracefully, ensuring process control remains in the application rather than the helper library.
- **Immutability:** Once parsed, the config must be frozen (`Object.freeze`) and not allow dynamic modifications at runtime.
- **Test Isolation:** Downstream services must be able to inject local config objects containing mock properties for test runs.

---

## 3. Considered Options

### Option A: Lazy Proxy-Based Config Accessor
- **Description:** Expose a `Proxy` wrapping validation logic that triggers on any property access.
- **Pros:** Completely transparent, defers parsing until first read.
- **Cons:** High complexity, difficult to debug, issues with TypeScript type coercion.

### Option B: Idempotent Singleton with Lazy Getter
- **Description:** Validate and store the config object inside a frozen module-level singleton initialized via `initializeConfig()`, and retrieve it via `getConfig()`. Support NestJS compatibility through a wrapper `ConfigService` adapter.
- **Pros:** Simple, explicit, type-safe, supports test isolation, prevents multiple parses, enforces idempotency.
- **Cons:** Requires explicit import/injection of `getConfig` or `ConfigService`.

---

## 4. Final Decision & Rationale

We chose **Option B (Idempotent Singleton with Lazy Getter)**.
This option provides direct type-safety and transparency. By exposing `getConfig()`, we ensure that the validated singleton is retrieved lazily without runtime overhead or compile-time crashes when required environment variables are absent. The `initializeConfig()` function ensures idempotency by verifying that subsequent calls return the existing instance but throw an error if conflicting environment parameters are supplied. 

This satisfies the user's constraints of maintaining clean separation of concerns and minimizing codebase complexity.

---

## 5. Consequences & Trade-offs

- **Positive Impacts:**
  - Clear error reporting on missing environment variables.
  - Runtime immutability is guaranteed by `Object.freeze()`.
  - Test modules can instantiate `new ConfigService(customEnv)` to simulate isolated configs.
- **Negative Impacts / Technical Debt:**
  - Downstream modules must use `getConfig()` or inject `ConfigService` to read configuration properties.
- **Mitigation Strategy:**
  - Standardize NestJS modules to inject `ConfigService` for runtime consistency.
