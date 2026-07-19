# Implementation Protocol

## Purpose

This document defines how implementation work is executed.

The objective is to ensure every implementation:
- follows the architecture,
- remains reviewable,
- minimizes regressions,
- and produces production-ready code.

Implementation must never begin directly from an idea.

---

# General Rules

Implementation always follows this order:

1. Architecture Complete
2. Implementation Plan Approved
3. Implementation
4. Verification
5. Review
6. Git Commit
7. Documentation Update

Skipping steps is prohibited.

---

# Implementation Granularity

Each implementation should complete one logical milestone.

Good examples:

- Logging package
- Authentication module
- Repository layer
- Controller layer
- Billing service

Bad examples:

- Entire authentication system
- Entire SaaS platform
- Whole backend

Large work must be divided.

---

# Before Implementation

Every implementation begins with an implementation plan.

The plan must include:

## Objective

What is being implemented?

---

## Scope

What files are expected to change?

---

## Out of Scope

What will NOT change?

---

## Risks

Potential breaking changes.

---

## Dependencies

Required completed phases.

---

## Verification Plan

Exactly how success will be verified.

---

## Questions

Architectural decisions requiring approval.

---

# During Implementation

Implementation must follow these principles:

- Small commits
- Clean code
- No temporary hacks
- No TODO comments
- No dead code
- No commented code
- No duplicated logic

---

# Architecture Rules

Implementation must never:

- bypass layers
- directly access the database from controllers
- skip repositories
- skip services
- violate dependency direction

Clean Architecture always wins.

---

# Testing Rules

Every implementation must include tests when applicable.

Priority:

1. Unit tests
2. Integration tests
3. E2E tests (later phases)

No implementation is complete without verification.

---

# Verification Checklist

Every implementation must verify:

- Build passes
- Typecheck passes
- Lint passes
- Tests pass
- No warnings
- No circular dependencies
- No unused exports

---

# Git Workflow

Every implementation ends with:

1. Git status verification
2. Conventional Commit
3. Push to remote
4. CI verification

---

# Documentation Updates

If implementation changes project status:

Update:

- PROJECT_STATUS.md
- CHANGELOG.md (if maintained)
- Relevant design document (if architecture changed)

Implementation is not complete until documentation matches reality.

---

# Definition of Done

Implementation is complete only when:

- Code implemented
- Tests passing
- CI passing
- Documentation updated
- Git pushed
- Project status updated
- No known regressions

Only then may the next implementation begin.