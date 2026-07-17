# ADR-003: Transaction Context Propagation Strategy

| Metadata Field | Value |
| :--- | :--- |
| **Status** | APPROVED |
| **Date** | 2026-07-17 |
| **Author** | Antigravity (Principal Software Architect) |
| **Deciders** | User, Antigravity |
| **Superseded By** | N/A |

---

## 1. Context & Problem Statement

Database transactions must be atomic and isolated. When executing business flows that span multiple service calls, passing active transaction connection handles down the call tree creates significant API pollution and increases coupling. We need an implicit database-agnostic transaction boundary manager that propagates connection state across asynchronous boundaries and enforces deterministic transaction state rules.

---

## 2. Decision Driver / Requirements

- **API Encapsulation:** Business layers should not receive database connection or transaction references directly in their methods.
- **Asynchronous Propagation:** Transactions must bind seamlessly to asynchronous call trees using Node.js `AsyncLocalStorage`.
- **Explicit Nesting Policy:** We must explicitly define propagation behavior for nested transaction boundaries.
- **Fail-Safe Lifecycle Validation:** Attempting invalid state transitions (like double commit/rollback or operating on closed transaction blocks) must fail immediately and deterministically.

---

## 3. Considered Options

### Option A: Manual Connection Threading
- **Description:** Inject the active client/connection handle into every repository and service method parameter.
- **Pros:** Completely transparent, does not require language-specific async context wrappers.
- **Cons:** Major design pollution. Forces all interfaces to carry persistence implementation details. Highly prone to connection leaks.

### Option B: AsyncLocalStorage with REQUIRED Propagation Policy
- **Description:** Implement a generic `TransactionManager` utilizing `AsyncLocalStorage`. Expose explicit `begin()`, `commit()`, and `rollback()` lifecycle methods. 
- **Propagation Policy:** Implement REQUIRED propagation explicitly. If a transaction context is already active in the current storage block, any nested calls will automatically reuse that active parent context client instead of opening independent parallel transaction connections.
- **Pros:** Zero method signature pollution. Clear, deterministic propagation. Enforces transaction state checks (preventing invalid state transitions).
- **Cons:** Relies on Node's async context tracking, which requires care when crossing non-standard async event loops.

---

## 4. Final Decision & Rationale

We selected **Option B (AsyncLocalStorage with REQUIRED Propagation Policy)**.
This option keeps our business code clean of database-specific connection threading. Enforcing the **REQUIRED** propagation policy ensures nested operations run inside the same atomic block without causing unmanaged parallel connections or deadlocks. Incorporating state checks inside `commit()` and `rollback()` ensures that lifecycle violations throw a deterministic `TransactionException` instantly.

---

## 5. Consequences & Trade-offs

- **Positive Impacts:**
  - Services can invoke transaction blocks recursively while naturally participating in the outer transaction context.
  - Fail-fast validation prevents stale commit/rollback attempts.
- **Negative Impacts / Technical Debt:**
  - Developers must ensure asynchronous operations do not escape ALS context tracking.
- **Mitigation Strategy:**
  - Provide helper wrappers like `runInTransaction()` that manage context setup and error-driven rollback automatically.
