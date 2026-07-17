# ADR-004: Lazy Database Connection & Transaction Context Integration

| Metadata Field | Value |
| :--- | :--- |
| **Status** | APPROVED |
| **Date** | 2026-07-17 |
| **Author** | Antigravity (Principal Software Architect) |
| **Deciders** | User, Antigravity |
| **Superseded By** | N/A |

---

## 1. Context & Problem Statement

Connecting to a database during code import leads to premature connection attempts and bootstrapping side effects, which breaks static analysis, testing execution, and compilation phases. We need to guarantee that database client pool initialization is lazy (only establishing connections when explicitly requested). Additionally, we need to bind executing queries to any active transactional context established by `@rishi/transaction` without polluting downstream business layers.

---

## 2. Decision Driver / Requirements

- **Lazy Initialization:** Importing `@rishi/database` must never trigger database connections. Connection pool setup must be lazy.
- **Observability & Connection Health:** Expose explicit connection checks (`ping` and `isConnected`) instead of generic health summaries.
- **Explicit Resource Cleanup:** Expose a disposal hook (`close()`) to gracefully end pool connections on application shutdown.
- **Implicit Transaction Context Access:** Automatically resolve the active transaction client if a transaction is running in `@rishi/transaction`'s async context.

---

## 3. Considered Options

### Option A: Global Single Eager Database Client
- **Description:** Expose a globally instantiated database client instance that immediately tries to connect to `process.env.DATABASE_URL`.
- **Pros:** Extremely simple to consume.
- **Cons:** Triggers connection errors at import time. Highly problematic during compilation, unit testing, and linting.

### Option B: Lazy Factory and DatabaseService Wrapper
- **Description:** Define `createDatabaseClient` which instantiates the pg Pool and Drizzle client. Wrap this inside a `DatabaseService` class that receives the `TransactionManager` and wraps transaction logic.
- **Transaction Binding:** The `DatabaseService` implements a `client` getter that checks `txManager.getActiveClient()` and falls back to the default Drizzle database client instance if no transaction context is active.
- **Pros:** Guarantees connection lazy load properties. Integrates cleanly with ALS. Supports graceful pool closure via `close()`. Easy to unit test using mocks.
- **Cons:** Downstream consumers must interact with the database via the `DatabaseService` wrapper.

---

## 4. Final Decision & Rationale

We chose **Option B (Lazy Factory and DatabaseService Wrapper)**.
Wrapping database access inside `DatabaseService` allows us to lazily create pools via `createDatabaseClient` and encapsulate Drizzle under a clean service layer. Resolving the active client via `client` getter intercepts queries and routes them to the active transaction client automatically. Graceful shutdown is managed cleanly via the `close()` method.

---

## 5. Consequences & Trade-offs

- **Positive Impacts:**
  - Build/compile stages execute without connection crashes.
  - Graceful connection termination prevents pool resource leaks on server exit.
  - Decouples transaction manager logic from raw database handlers.
- **Negative Impacts / Technical Debt:**
  - Deferred pgvector integration helpers until a future persistence milestone.
- **Mitigation Strategy:**
  - Register `DatabaseService` as a shared NestJS provider in `AppModule`.
