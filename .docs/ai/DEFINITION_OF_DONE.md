# DEFINITION_OF_DONE.md

> **Version:** 1.0.0  
> **Status:** Active  
> **Owner:** Rishi AI Founder & CTO  
> **Purpose:** Defines the mandatory completion criteria for every engineering activity. No task, module, milestone, or phase may be marked complete unless its applicable Definition of Done (DoD) has been fully satisfied.

---

# Philosophy

"Code Compiles" is **not** considered done.

"Tests Pass" is **not** considered done.

"Feature Works" is **not** considered done.

Work is considered complete only when **implementation, verification, documentation, architecture, and repository state** are all complete.

---

# Global Definition of Done

Every completed task must satisfy:

- Functional implementation completed
- Architecture preserved
- Coding standards followed
- Tests implemented
- Existing tests passing
- Build passing
- Typecheck passing
- Lint passing
- Documentation updated
- Project status updated (when applicable)
- Roadmap updated (when applicable)
- Git committed
- Git pushed (when instructed)

---

# Definition of Done — Feature

A feature is complete only when:

- [ ] Scope fully implemented
- [ ] Acceptance criteria satisfied
- [ ] No known functional bugs
- [ ] Error handling implemented
- [ ] Logging implemented
- [ ] Configuration externalized
- [ ] Unit tests added
- [ ] Integration tests updated (if applicable)
- [ ] API documented (if applicable)
- [ ] Build passes
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Tests pass

---

# Definition of Done — Bug Fix

A bug fix is complete only when:

- [ ] Root cause identified
- [ ] Root cause documented
- [ ] Bug fixed
- [ ] Regression prevented
- [ ] Existing functionality verified
- [ ] Regression tests added
- [ ] Build passes
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Tests pass

---

# Definition of Done — Refactoring

Refactoring is complete only when:

- [ ] No behavior changed
- [ ] Architecture improved
- [ ] Complexity reduced
- [ ] Duplication reduced
- [ ] Public APIs preserved
- [ ] Tests unchanged or improved
- [ ] Performance not degraded
- [ ] Build passes
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Tests pass

---

# Definition of Done — Infrastructure

Infrastructure work is complete only when:

- [ ] Configuration implemented
- [ ] Startup verified
- [ ] Failure scenarios verified
- [ ] Security reviewed
- [ ] Logging verified
- [ ] Documentation updated
- [ ] CI compatible
- [ ] Build passes
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Tests pass

---

# Definition of Done — API Module

An API module is complete only when:

- [ ] Routes implemented
- [ ] Validation implemented
- [ ] Error handling implemented
- [ ] Response contracts implemented
- [ ] Swagger updated
- [ ] Tests added
- [ ] Authentication considered
- [ ] Authorization considered
- [ ] Logging implemented
- [ ] Build passes
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Tests pass

---

# Definition of Done — Domain Module

A domain module is complete only when:

- [ ] Entities implemented
- [ ] Value Objects implemented
- [ ] Domain Services implemented
- [ ] Repository contracts defined
- [ ] Domain Events added (if needed)
- [ ] Business rules tested
- [ ] Framework independence preserved
- [ ] Build passes
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Tests pass

---

# Definition of Done — Persistence Module

A persistence module is complete only when:

- [ ] Repository implemented
- [ ] Mapping verified
- [ ] Transactions verified
- [ ] Database integration tested
- [ ] No domain leakage
- [ ] Build passes
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Tests pass

---

# Definition of Done — Documentation

Documentation is complete only when:

- [ ] Accurate
- [ ] Up-to-date
- [ ] Cross-referenced
- [ ] Version updated
- [ ] Formatting verified
- [ ] No obsolete content
- [ ] Stored in correct location

---

# Definition of Done — Milestone

A milestone is complete only when:

- [ ] All planned modules completed
- [ ] No pending implementation
- [ ] No blockers
- [ ] Verification complete
- [ ] Documentation synchronized
- [ ] PROJECT_STATUS updated
- [ ] Milestone frozen
- [ ] Git committed
- [ ] Git pushed

---

# Definition of Done — Phase

A phase is complete only when:

- [ ] All milestones completed
- [ ] All deliverables implemented
- [ ] Architecture verified
- [ ] Technical debt reviewed
- [ ] Documentation synchronized
- [ ] PROJECT_STATUS updated
- [ ] Roadmap advanced
- [ ] Phase frozen
- [ ] Repository clean
- [ ] Git committed
- [ ] Git pushed

---

# Definition of Done — Release

A release is complete only when:

- [ ] Release scope completed
- [ ] Build successful
- [ ] Tests passing
- [ ] Security verified
- [ ] CI passing
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Version bumped
- [ ] Release tagged

---

# Mandatory Verification Commands

Unless explicitly instructed otherwise, every completed implementation must successfully execute:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Additional commands may be required depending on the scope.

---

# Completion Report Requirements

Every completed implementation must include a completion report containing:

## Summary

- What was implemented
- Files modified
- Files created

## Verification

- Tests
- Build
- Typecheck
- Lint

## Documentation

- Updated documents
- Updated roadmap
- Updated status tracker

## Git

- Commit SHA
- Commit message
- Branch
- Push status

---

# Repository State Requirement

Before declaring completion:

- Working tree must be clean
- No temporary files
- No debug code
- No commented dead code
- No unused imports
- No generated artifacts accidentally committed

---

# Final Rule

Nothing may be declared **Done** until every applicable Definition of Done has been satisfied.

If any requirement remains incomplete, the correct status is:

> **In Progress**

not

> **Completed**