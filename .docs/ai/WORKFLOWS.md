# WORKFLOWS.md

> **Version:** 1.0.0
> **Status:** Active
> **Owner:** Rishi AI Founder & CTO
> **Purpose:** Defines the standard engineering workflows followed throughout the lifecycle of the Rishi AI project.

---

# Philosophy

Every engineering task follows a predefined workflow.

Workflows exist to ensure:

- Consistency
- Predictability
- Architectural integrity
- Documentation synchronization
- High software quality

No implementation should skip any required workflow stage.

---

# Workflow Categories

The project currently supports:

1. New Feature
2. Bug Fix
3. Hotfix
4. Refactoring
5. Technical Debt
6. Architecture Change
7. Dependency Upgrade
8. Documentation Update
9. Release
10. Phase Completion

---

# Workflow 1 — New Feature

Used whenever new functionality is added.

## Sequence

```
Read Roadmap
        │
        ▼
Read Relevant Documents
        │
        ▼
Dependency Analysis
        │
        ▼
Implementation Plan
        │
        ▼
Architecture Review
        │
        ▼
Implementation
        │
        ▼
Unit Tests
        │
        ▼
Integration Tests
        │
        ▼
Verification
        │
        ▼
Documentation Update
        │
        ▼
PROJECT_STATUS Update
        │
        ▼
Commit
        │
        ▼
Push
```

Never skip review before implementation.

---

# Workflow 2 — Bug Fix

Used whenever existing behavior is incorrect.

## Sequence

```
Reproduce Bug
        │
        ▼
Root Cause Analysis
        │
        ▼
Impact Analysis
        │
        ▼
Fix Plan
        │
        ▼
Implementation
        │
        ▼
Regression Tests
        │
        ▼
Verification
        │
        ▼
Documentation (if required)
        │
        ▼
Commit
        │
        ▼
Push
```

Never patch symptoms.

Always identify root cause.

---

# Workflow 3 — Hotfix

Used for production-breaking issues.

## Sequence

```
Confirm Severity
        │
        ▼
Minimal Fix
        │
        ▼
Regression Verification
        │
        ▼
Deploy
        │
        ▼
Postmortem
        │
        ▼
Documentation
```

Only minimal changes are allowed.

No opportunistic refactoring.

---

# Workflow 4 — Refactoring

Used when behavior remains unchanged.

## Sequence

```
Review Existing Code
        │
        ▼
Identify Improvement
        │
        ▼
Refactor
        │
        ▼
Regression Tests
        │
        ▼
Verification
        │
        ▼
Commit
```

No behavioral changes.

---

# Workflow 5 — Technical Debt

Used to improve long-term maintainability.

## Sequence

```
Identify Debt
        │
        ▼
Evaluate Cost
        │
        ▼
Architecture Review
        │
        ▼
Implementation
        │
        ▼
Regression Tests
        │
        ▼
Documentation
```

Technical debt must never be hidden.

---

# Workflow 6 — Architecture Change

Highest-risk workflow.

## Sequence

```
Identify Limitation
        │
        ▼
Research Alternatives
        │
        ▼
Trade-off Analysis
        │
        ▼
ADR Creation
        │
        ▼
Architecture Approval
        │
        ▼
Implementation Plan
        │
        ▼
Implementation
        │
        ▼
Verification
        │
        ▼
Documentation
```

Architecture changes always require an ADR.

---

# Workflow 7 — Dependency Upgrade

Used when upgrading libraries.

## Sequence

```
Identify Version
        │
        ▼
Read Changelog
        │
        ▼
Compatibility Analysis
        │
        ▼
Upgrade
        │
        ▼
Build
        │
        ▼
Tests
        │
        ▼
Verification
```

Never upgrade blindly.

---

# Workflow 8 — Documentation Update

Used whenever project documents become outdated.

## Sequence

```
Identify Changed Documents
        │
        ▼
Update Documents
        │
        ▼
Verify Consistency
        │
        ▼
Commit
```

Documentation must never lag behind implementation.

---

# Workflow 9 — Release

Used after completing a milestone.

## Sequence

```
Verification
        │
        ▼
Documentation
        │
        ▼
PROJECT_STATUS
        │
        ▼
CHANGELOG
        │
        ▼
Commit
        │
        ▼
Push
        │
        ▼
Release Summary
```

---

# Workflow 10 — Phase Completion

Executed after every engineering phase.

## Sequence

```
Complete Planned Scope
        │
        ▼
Run All Tests
        │
        ▼
Run Build
        │
        ▼
Run Typecheck
        │
        ▼
Run Lint
        │
        ▼
Update PROJECT_STATUS
        │
        ▼
Update Roadmap
        │
        ▼
Freeze Phase
        │
        ▼
Commit
        │
        ▼
Push
```

Every completed phase becomes immutable unless a future phase explicitly revisits it.

---

# CI Workflow

Every push must successfully pass:

```
Install
      │
      ▼
Format Check
      │
      ▼
Lint
      │
      ▼
Build
      │
      ▼
Typecheck
      │
      ▼
Tests
      │
      ▼
Security Audit
```

A failed CI blocks completion.

---

# Review Workflow

Every implementation plan must be reviewed before coding.

Review includes:

- Architecture
- Scope
- Dependencies
- Security
- Maintainability
- Scalability
- Documentation impact

Only approved plans may be implemented.

---

# Definition of Complete

A workflow is complete only when:

- Scope implemented
- Tests passing
- Build passing
- Typecheck passing
- Lint passing
- Documentation updated
- PROJECT_STATUS updated
- Git committed
- Changes pushed
- CI passing

Anything less is considered incomplete.

---

# Workflow Ownership

| Workflow | Owner |
|----------|-------|
| Planning | AI Engineering Agent |
| Review | AI Engineering Agent |
| Architecture | AI Engineering Agent |
| Implementation | AI Engineering Agent |
| Testing | AI Engineering Agent |
| Documentation | AI Engineering Agent |
| Git | AI Engineering Agent |
| Release | AI Engineering Agent |

---

# Guiding Principle

Workflows exist to eliminate inconsistency.

The Engineering Agent should always execute the appropriate workflow automatically instead of requiring repeated instructions from the founder.