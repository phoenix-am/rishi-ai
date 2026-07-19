# CHECKLISTS.md

> **Version:** 1.0.0  
> **Status:** Active  
> **Owner:** Rishi AI Founder & CTO  
> **Purpose:** Defines mandatory engineering checklists that must be completed before considering any task finished.

---

# Philosophy

Every engineering activity should be verified through checklists.

Checklists prevent:

- Forgotten steps
- Architecture drift
- Missing tests
- Outdated documentation
- Broken CI
- Incomplete implementations

No checklist item may be skipped without explicit approval.

---

# 1. Pre-Implementation Checklist

Before writing code, verify:

- [ ] Current phase identified
- [ ] Current milestone identified
- [ ] Relevant roadmap reviewed
- [ ] Relevant TDD reviewed
- [ ] SDD reviewed (if applicable)
- [ ] DMS reviewed (if domain changes)
- [ ] Existing implementation analyzed
- [ ] Dependencies identified
- [ ] Package boundaries understood
- [ ] Scope confirmed
- [ ] Out-of-scope identified
- [ ] Risks identified
- [ ] Implementation plan prepared
- [ ] Architecture reviewed

Implementation must not begin until this checklist is complete.

---

# 2. Architecture Checklist

Before implementing any module:

- [ ] Clean Architecture preserved
- [ ] SOLID followed
- [ ] DDD boundaries respected
- [ ] No circular dependencies
- [ ] Package isolation maintained
- [ ] Dependency inversion preserved
- [ ] Infrastructure isolated
- [ ] Domain remains framework-independent
- [ ] APIs remain stable
- [ ] No unnecessary abstractions

---

# 3. Implementation Checklist

During implementation verify:

- [ ] Only approved scope implemented
- [ ] No unrelated refactoring
- [ ] Naming consistent
- [ ] Logging added where appropriate
- [ ] Errors handled
- [ ] Dependency injection used
- [ ] Configuration externalized
- [ ] No duplicated logic
- [ ] Code follows project conventions

---

# 4. Testing Checklist

Every implementation must verify:

- [ ] Unit tests added
- [ ] Existing tests updated
- [ ] Regression tests considered
- [ ] Edge cases covered
- [ ] Failure paths tested
- [ ] Happy paths tested
- [ ] Mocking appropriate
- [ ] Test naming consistent

---

# 5. Verification Checklist

Before completion:

- [ ] Build passes
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Tests pass
- [ ] CI expected to pass
- [ ] No compiler warnings
- [ ] No TODOs introduced
- [ ] No debug code remains

---

# 6. Documentation Checklist

Whenever required:

- [ ] PROJECT_STATUS updated
- [ ] Roadmap updated
- [ ] TDD updated
- [ ] ADR created (if architecture changed)
- [ ] API documentation updated
- [ ] README updated (if applicable)
- [ ] CHANGELOG updated (if maintained)

Documentation should always reflect the current implementation.

---

# 7. Git Checklist

Before committing:

- [ ] Working tree reviewed
- [ ] Only intended files changed
- [ ] Generated files excluded
- [ ] Commit message follows Conventional Commits
- [ ] Commit scope accurate
- [ ] Commit body meaningful
- [ ] Branch verified

Before pushing:

- [ ] Latest changes pulled (if applicable)
- [ ] Local verification completed
- [ ] Push target verified

---

# 8. Pull Request Checklist (Future)

When PR workflow is introduced:

- [ ] Scope explained
- [ ] Screenshots attached (if UI)
- [ ] Tests passing
- [ ] Documentation updated
- [ ] Breaking changes documented
- [ ] Review comments addressed

---

# 9. Release Checklist

Before freezing a milestone:

- [ ] Planned work completed
- [ ] Verification complete
- [ ] Documentation synchronized
- [ ] PROJECT_STATUS updated
- [ ] Roadmap advanced
- [ ] Git history clean
- [ ] CI passing
- [ ] Release summary generated

---

# 10. Phase Completion Checklist

Before closing a phase:

- [ ] All planned modules completed
- [ ] No open blockers
- [ ] No failing tests
- [ ] No failing builds
- [ ] Documentation frozen
- [ ] PROJECT_STATUS updated
- [ ] Phase marked complete
- [ ] Next phase identified
- [ ] Git push completed

---

# 11. Architecture Change Checklist

If architecture changes:

- [ ] Problem documented
- [ ] Alternatives evaluated
- [ ] Trade-offs explained
- [ ] ADR created
- [ ] Impact assessed
- [ ] Existing modules reviewed
- [ ] Documentation updated

---

# Completion Rule

A task is **not complete** until every applicable checklist has been satisfied.

The Engineering Agent must automatically execute the relevant checklist(s) before declaring work complete.

If any checklist item fails, the task remains **In Progress**.