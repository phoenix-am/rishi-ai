# Rishi AI Engineering Rulebook v1.0

> **Purpose**
>
> This rulebook defines how every feature moves from idea to production.
> The goal is to eliminate unnecessary discussions, avoid endless review loops,
> and maximize implementation speed while maintaining quality.
>
> This document governs the engineering process, **not the product**.

---

# Rule 1 — Single Source of Truth

Every piece of information must exist in only one document.

| Information | Source |
|-------------|--------|
| Business Requirements | PRD |
| System Design | SDD |
| Feature Design | TDD |
| Current Feature Work | Feature Contract |

No document should duplicate another document.

---

# Rule 2 — Approved Means Frozen

Once a stage is approved, it becomes frozen.

The approved artifact cannot be modified unless a **Critical Blocker** is identified.

---

# Rule 3 — One-Way Workflow

Features only move forward.

```
Requirements
    ↓
PRD
    ↓
SDD
    ↓
TDD
    ↓
Feature Contract
    ↓
Implementation Plan
    ↓
Implementation
    ↓
Testing
    ↓
Done
```

Backward movement is prohibited unless a Critical Blocker exists.

---

# Rule 4 — Single Responsibility

Every participant has exactly one responsibility.

## Product Owner

Responsible for:

- Requirements
- Prioritization
- Scope Approval
- Final Approval

Not Responsible for:

- Architecture
- Implementation

---

## Architect (Gemini)

Responsible for:

- System Design
- Technical Design
- TDD

Not Responsible for:

- Code
- Implementation
- Scope changes after approval

---

## Implementation Engineer (Antigravity)

Responsible for:

- Implementation Planning
- Feature Implementation

Not Responsible for:

- Architecture redesign
- Feature expansion

---

## Validator

Responsible for:

- Validation

Not Responsible for:

- Optimization
- Suggestions
- New Features
- Architecture Improvements

---

# Rule 5 — Validation, Not Review

The implementation plan must be **validated**, not reviewed.

Allowed validation questions:

- Does it follow the approved TDD?
- Does it violate the approved scope?
- Does it introduce breaking changes?
- Does it introduce security risks?
- Is implementation technically impossible?

Anything outside these questions is not allowed.

---

# Rule 6 — Suggestions Never Block Development

Suggestions are welcome.

Suggestions never block implementation.

Every suggestion must go into the Product Backlog.

---

# Rule 7 — Only Critical Blockers Stop Development

Development can only stop when one of the following exists:

- Missing Requirement
- Architecture Contradiction
- Security Risk
- Data Loss Risk
- Impossible Implementation

Everything else continues.

---

# Rule 8 — Maximum Revision Count

Maximum revisions allowed:

| Stage | Maximum |
|---------|---------|
| Architecture | 2 |
| Feature Contract | 2 |
| Implementation Plan | 1 Validation |

No unlimited review cycles.

---

# Rule 9 — One Decision Per Stage

Every stage has exactly one decision.

| Stage | Decision |
|---------|----------|
| Architecture | Approve / Revise |
| Feature Contract | Approve / Revise |
| Implementation Plan | Valid / Invalid |
| Implementation | Complete / Blocked |
| Testing | Pass / Fail |

Nothing else.

---

# Rule 10 — No Improvements During Execution

Once implementation starts, the following are prohibited:

- Architecture redesign
- Refactoring
- Performance optimization
- Folder restructuring
- Feature enhancement
- Code beautification

Allowed:

- Bug fixes
- Blocking issue resolution

Everything else goes to the Product Backlog.

---

# Rule 11 — Scope Lock

Scope can only be changed by the Product Owner.

Scope changes are only allowed **before implementation begins**.

After implementation starts:

No Scope Changes.

---

# Rule 12 — Finish Before Starting

No new feature implementation begins until the current feature reaches Done.

Rule:

> Start Less. Finish More.

---

# Rule 13 — Progress Over Perfection

The goal is:

- Not perfect documentation.
- Not perfect architecture.
- Not perfect implementation.

The goal is:

**Deliver completed, working features.**

---

# Rule 14 — AI Authority Boundaries

Every AI must stay inside its responsibility.

Architect cannot redesign implementation.

Implementation Engineer cannot redesign architecture.

Validator cannot introduce new requirements.

Product Owner owns all final decisions.

---

# Rule 15 — Approved Stages Cannot Be Reopened

An approved stage cannot be reopened because:

- someone found a better idea
- someone found a cleaner implementation
- someone suggested an optimization

Approved stages can only be reopened for Critical Blockers.

---

# Rule 16 — Product Backlog

The following items never stop implementation:

- Improvements
- Optimizations
- Future Enhancements
- Better UX Ideas
- Better Architecture Ideas
- Better Folder Structure
- Better Naming

These items must be moved into the Product Backlog.

---

# Rule 17 — Automatic Backlog Management

If an improvement, optimization, refactoring opportunity,
or future enhancement is identified during implementation
or validation:

1. It must NOT block the current feature.

2. It must automatically be appended to BACKLOG.md.

3. Development must continue immediately.

No approval is required unless the suggestion changes
the current feature scope.

---

# Daily Engineering Workflow

```
Requirement
    ↓
Architecture (Gemini)
    ↓
Product Owner Approval
    ↓
Feature Contract
    ↓
Implementation Plan (Antigravity)
    ↓
Validation
    ↓
Implementation (Antigravity)
    ↓
Testing
    ↓
Done
```

---

# Critical Blocker Definition

A Critical Blocker is a problem that makes implementation impossible or unsafe.

Examples:

- Missing requirement
- Conflicting architecture
- Security vulnerability
- Data corruption risk
- Breaking API contract
- Impossible implementation

Anything else is **not** a Critical Blocker.

---

# Validation Checklist

The validator may only answer the following questions:

- Does the Implementation Plan follow the approved Feature Contract?
- Does it follow the approved TDD?
- Does it violate the approved Scope?
- Does it violate Security requirements?
- Does it introduce Breaking Changes?

If all answers are acceptable:

STATUS = VALID

Implementation begins immediately.

---

# Golden Principle

> Every stage exists to enable the next stage,
> not to perfect itself.