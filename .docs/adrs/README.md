# Architectural Decision Records (ADRs)

This directory serves as the log for all load-bearing technical and architectural decisions made for **Rishi AI**.

---

## 1. Purpose & Logging Mandate

As defined in the **[Engineering Constitution](file:///c:/Users/Anmol/Desktop/rishi-ai/.docs/ENGINEERING_CONSTITUTION.md#architectural-decision-records-adr)**:
* Major technical decisions should never rely on memory.
* Every significant architectural decision must be documented.
* This creates a clear historical trail that makes future maintenance, technology migrations, and onboarding significantly easier.

---

## 2. Rules for ADR Lifecycle

* **Append-Only:** Once an ADR is approved and committed, it must never be modified or rewritten.
* **Supersession:** If a previous decision becomes outdated or is replaced, a new ADR must be logged explaining the changes and explicitly linking to the old ADR, marking the old ADR status as `SUPERSEDED BY ADR-XXX`.
* **Naming Convention:** Files must follow the format `ADR-XXX_descriptive_name.md` where `XXX` is a sequential 3-digit number (e.g., `ADR-001_database_selection.md`).

---

## 3. ADR Index

| ADR ID | Decision Name | Status | Date | Summary |
| :--- | :--- | :--- | :--- | :--- |
| **ADR-000** | [ADR Repository Setup](file:///c:/Users/Anmol/Desktop/rishi-ai/.docs/adrs/README.md) | **APPROVED** | 2026-07-16 | Standardizes the decision log structure and templates. |
| **ADR-001** | [Configuration Management Strategy](file:///c:/Users/Anmol/Desktop/rishi-ai/.docs/adrs/ADR-001_configuration_management.md) | **APPROVED** | 2026-07-17 | Enforces strict schemas and idempotent config singletons. |
| **ADR-002** | [Logger Architecture & Encapsulation](file:///c:/Users/Anmol/Desktop/rishi-ai/.docs/adrs/ADR-002_logger_architecture.md) | **APPROVED** | 2026-07-17 | Hides Pino implementation and externalizes correlation contexts. |
| **ADR-003** | [Transaction Context Propagation Strategy](file:///c:/Users/Anmol/Desktop/rishi-ai/.docs/adrs/ADR-003_transaction_context_propagation.md) | **APPROVED** | 2026-07-17 | Establishes generic ALS tracking and REQUIRED nested propagation policy. |
| **ADR-004** | [Lazy Database Connection & Transaction Context Integration](file:///c:/Users/Anmol/Desktop/rishi-ai/.docs/adrs/ADR-004_lazy_database_connection.md) | **APPROVED** | 2026-07-17 | Enforces lazy initialization, pool cleanup, and transactional bindings. |

---

## 4. Standard ADR Template

All future ADRs must employ the following markdown template:

```markdown
# ADR-[NUM]: [Short, Descriptive Title]

| Metadata Field | Value |
| :--- | :--- |
| **Status** | [Proposed / Accepted / Rejected / Superseded] |
| **Date** | [YYYY-MM-DD] |
| **Author** | [Name/Title] |
| **Deciders** | [List of deciders] |
| **Superseded By** | [Link to ADR-XXX if applicable] |

---

## 1. Context & Problem Statement

Describe the context prompting this decision. Explain the problem, constraints, or opportunities we are addressing. Ensure it links directly to requirements in the [PRD](file:///c:/Users/Anmol/Desktop/rishi-ai/.docs/PRODUCT_REQUIREMENTS_DOCUMENT.md) or principles in the [Constitution](file:///c:/Users/Anmol/Desktop/rishi-ai/.docs/ENGINEERING_CONSTITUTION.md).

---

## 2. Decision Driver / Requirements

List the factors that make this choice critical (e.g., cost, performance, developer velocity, technology lock-in).

---

## 3. Considered Options

Detail the options we evaluated.

### Option A: [Option Name]
* **Description:** ...
* **Pros:** ...
* **Cons:** ...

### Option B: [Option Name]
* **Description:** ...
* **Pros:** ...
* **Cons:** ...

---

## 4. Final Decision & Rationale

State the option chosen and outline the technical and financial reasons for selection. Explicitly address how this option satisfies the founder's constraints.

---

## 5. Consequences & Trade-offs

Describe the impact of this decision on the codebase, workflow, and operations.
* **Positive Impacts:** ...
* **Negative Impacts / Technical Debt:** ...
* **Mitigation Strategy:** ...
```
