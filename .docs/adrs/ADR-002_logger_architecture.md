# ADR-002: Logger Architecture & Encapsulation

| Metadata Field | Value |
| :--- | :--- |
| **Status** | APPROVED |
| **Date** | 2026-07-17 |
| **Author** | Antigravity (Principal Software Architect) |
| **Deciders** | User, Antigravity |
| **Superseded By** | N/A |

---

## 1. Context & Problem Statement

Standardized structured JSON logging is critical for Rishi AI's observability. To ensure future maintainability, we must prevent direct dependencies on any single logging library (like Pino) from scattering across business layer codebases. The logging implementation must be fully encapsulated behind a generic interface, constructed via a stateless factory, and support correlation context tracing without claiming ownership of asynchronous state storage (such as `AsyncLocalStorage`).

---

## 2. Decision Driver / Requirements

- **Framework Encapsulation:** Business logic depends only on `ILogger`. The underlying logging engine (Pino) is hidden.
- **Single-Line Observability:** Must output unified JSON messages containing context metadata.
- **Externalized Context Ownership:** The logger package must not implement or own asynchronous storage buffers (e.g. `AsyncLocalStorage`). Instead, it should lazily retrieve correlation IDs via an optional callback provider hook.
- **Stateless Lifecycle:** `LoggerFactory` must not cache logger instances or preserve state.

---

## 3. Considered Options

### Option A: Eager Request Middleware and Internal Context Management
- **Description:** Implement custom NestJS middlewares and Fastify plugins inside `@rishi/logger` that run `AsyncLocalStorage` and intercept incoming HTTP flows.
- **Pros:** Out-of-the-box request logging functionality.
- **Cons:** Violates boundary rules by adding request routing/framework concerns into a low-level utility package.

### Option B: Interface-Driven Injection with Provider Callback
- **Description:** Define a stateless `LoggerFactory.createLogger` that accepts a `correlationIdProvider: () => string | undefined` callback, and wraps Pino.
- **Pros:** Completely decouples request context extraction and storage ownership from logging logic. Zero NestJS framework hooks in logger package. Highly testable.
- **Cons:** The consuming application must provide the callback hook mapping context-store lookups.

---

## 4. Final Decision & Rationale

We chose **Option B (Interface-Driven Injection with Provider Callback)**.
By hiding the `PinoLoggerAdapter` and exporting only `ILogger` and the stateless `LoggerFactory`, we shield downstream modules from library-specific APIs. By using a callback (`correlationIdProvider`), we delegate correlation ID context resolution to the application layers, keeping `@rishi/logger` lean, database/framework-agnostic, and clean of async storage container management.

---

## 5. Consequences & Trade-offs

- **Positive Impacts:**
  - Easy to swap the logging backend (e.g., from Pino to Winston or Bunyan) without mutating business codebase files.
  - Zero side-effects or global state caching inside `LoggerFactory`.
- **Negative Impacts / Technical Debt:**
  - The main application server must set up `AsyncLocalStorage` and pass the provider callback during bootstrap.
- **Mitigation Strategy:**
  - Standardize NestJS initialization to register the logger via provider mapping to `AsyncLocalStorage` values.
