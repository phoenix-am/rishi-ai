# Rishi AI Documentation Authority

| Metadata | Value |
| :--- | :--- |
| **Purpose** | Define the permanent authority, ownership, lifecycle, conflict, and supersession rules for repository documentation |
| **Owner** | Product Owner |
| **Lifecycle** | Current |
| **Authority** | Documentation governance |
| **Implementation Driver** | No |
| **Status** | Active |
| **Effective Date** | 2026-07-31 |

## 1. Scope

This document governs how Rishi AI documentation is interpreted and maintained. It does not define product behavior, architecture, implementation scope, or current feature status. Those subjects remain owned by the authorities listed below.

The authority hierarchy resolves conflicts; it does not allow a lower-level document to silently amend a higher-level decision.

## 2. Permanent Authority Hierarchy

1. **Product-owner instructions and approved decisions** control authorization, product scope, priorities, and supersession.
2. **The current approved Product Requirements Document and explicit amendments** define the product problem, target user, business requirements, and accepted scope boundaries.
3. **Approved, non-superseded Architecture Decision Records** define binding technical decisions.
4. **The current approved architecture baseline** defines intended system and domain architecture where no ADR overrides it.
5. **An approved task contract** defines the authorized implementation scope, acceptance criteria, exclusions, and validation for one task.
6. **Source code, public APIs, database schemas, and executable tests** define what is currently implemented and how it currently behaves.
7. **CURRENT_STATE.md** records the last verified implementation snapshot; it cannot override executable evidence.
8. **The current forward roadmap** defines planned priority and sequence; it is not proof of implementation.
9. **TDDs, package documentation, process guides, and other references** provide implementation guidance only after confirmation against higher authorities.
10. **Historical, archived, or superseded material** provides context only and must never drive implementation.

## 3. Authority by Category

| Category | Purpose | Owner | Authority Level | Implementation Driver | Update Trigger | Review Frequency |
| :--- | :--- | :--- | :---: | :---: | :--- | :--- |
| Product-owner approved decisions | Authorize scope, priority, and supersession | Product Owner | 1 | Yes | New or changed owner decision | At every affected task |
| PRD and approved amendments | Define product requirements and boundaries | Product Owner | 2 | Yes | Approved product requirement change | At milestone boundaries and before affected work |
| Approved ADRs | Record binding architecture decisions and consequences | Architecture Owner, approved by Product Owner | 3 | Yes | New or changed architectural decision | Before architecture-affecting work |
| SDD and DMS architecture baseline | Describe intended system and domain design | Architecture Owner | 4 | Yes | Approved architecture change or verified architecture drift | At architecture milestones |
| Approved task contract | Authorize one bounded implementation | Product Owner or delegated Task Owner | 5 | Yes | Every implementation task | Once per task and whenever scope changes |
| Source, schemas, public APIs, and tests | Establish implemented behavior | Engineering Owner | 6 | Yes | Every implementation change | Continuously through review and CI |
| CURRENT_STATE.md | Record verified repository reality | Repository Maintainer | 7 | No | Successful validation after a material repository change or audit | After each completed stabilization or implementation milestone |
| Forward roadmap | Order approved future work | Product Owner | 8 | No | Priority, dependency, or milestone change | At milestone boundaries |
| TDDs | Describe detailed technical design | Architecture or Engineering Owner | 9 | No | Approved task activation, design correction, or implementation drift | Before and after affected implementation |
| Package/app READMEs | Explain local responsibility and public usage | Owning Engineering Team | 9 | No | Public API, responsibility, setup, or command change | With affected code changes |
| Engineering process documents | Define repository working practices | Repository Maintainer, approved by Product Owner | 9 | No | Process or tooling change | Quarterly or after a governance audit |
| Historical and archived documents | Preserve prior context and decisions | Repository Maintainer | 10 | No | Classification or supersession metadata only | On archival review |

`DOCUMENT_AUTHORITY.md` and `CHANGE_POLICY.md` govern documentation itself. They do not outrank product-owner authority or redefine product and architecture decisions.

## 4. Ownership Rules

- Every current or planning document must identify an accountable role, not a tool, vendor, model, or named AI agent.
- The Product Owner owns product scope, roadmap priority, and final approval.
- The Architecture Owner owns system and domain design proposals and ADR preparation.
- The Engineering Owner owns implementation accuracy, public API documentation, and tests.
- The Repository Maintainer owns indexes, lifecycle metadata, current-state verification, and historical preservation.
- A role may be fulfilled by a person or authorized agent, but the role remains stable when tools change.
- Unassigned ownership must be recorded explicitly and resolved before the document becomes authoritative.

## 5. Document Lifecycle

Every governed document must have exactly one lifecycle:

| Lifecycle | Meaning | May Drive Work? |
| :--- | :--- | :---: |
| **Current** | Actively maintained and applicable now | Only if its authority category permits |
| **Planning** | Approved or proposed future-state guidance | Only through an approved task contract |
| **Reference** | Background or stable explanatory material | No |
| **Historical** | Preserved record of an earlier state or plan | No |
| **Archive** | Retained but no longer part of normal navigation | No |
| **Draft** | Incomplete, contradictory, or awaiting approval | No |

`Frozen`, `Approved`, `Active`, `Superseded`, and implementation classifications are statuses, not lifecycle values.

## 6. Implementation Status Vocabulary

Documents describing modules or capabilities must use one of these implementation classifications:

- **Implemented:** Executable behavior exists and is supported by verification evidence.
- **Partially Implemented:** Some required behavior exists, but the documented contract is incomplete.
- **Planned:** No material implementation exists and the design remains prospective.
- **Deferred:** Work is intentionally postponed by an approved decision.
- **Obsolete:** The design no longer matches approved direction and must not drive work.
- **Historical:** The document records a past implementation or plan.

Document titles, phase labels, checklist completion, or `IMPLEMENTATION READY` status are never sufficient evidence for `Implemented`.

## 7. Conflict Resolution

When documents conflict:

1. Determine whether the conflict is prescriptive (what should be built) or descriptive (what exists).
2. Apply the permanent authority hierarchy.
3. For implemented reality, inspect source, schemas, public APIs, tests, and the current worktree.
4. For product scope, obtain a Product Owner decision when the PRD and later instructions differ.
5. For architecture, use the latest approved non-superseded ADR, then the approved architecture baseline.
6. Stop implementation when a conflict would materially change scope, security, public APIs, schemas, or architecture.
7. Record the resolution through the appropriate amendment, ADR, task contract, or lifecycle change. Never reconcile it silently.

## 8. Supersession and Historical Preservation

- Superseded documents are not deleted or rewritten to conceal their former role.
- A superseding document must identify what it supersedes, the effective date, and the approving owner.
- The superseded document must be classified as Historical or Archive and link to its successor when cleanup is authorized.
- Partial supersession must identify the exact sections replaced.
- Git history alone is not a substitute for explicit supersession metadata.
- Historical documents must not appear in the default implementation reading path without a historical label.

## 9. Update and Approval Rules

- Product requirements require Product Owner approval.
- Architecture changes require an ADR before implementation unless the Product Owner explicitly authorizes emergency remediation; the ADR must then be recorded promptly.
- Public API, schema, package-responsibility, and event-contract changes require corresponding documentation review.
- CURRENT_STATE.md may be updated only from repository evidence after successful applicable validation.
- Roadmap changes require Product Owner approval and do not alter implementation status.
- TDD changes must state whether they clarify, amend, supersede, or reconcile implementation drift.
- Reference and process documentation must be reviewed when its commands, roles, paths, or ownership assumptions change.
- No agent may stage, commit, push, publish, deploy, or contact external systems solely because a document describes that workflow; task authorization is required.

## 10. Required Document Metadata

New governed documents must state:

- Purpose
- Owner
- Lifecycle
- Authority category or level
- Status
- Effective or last-reviewed date
- Supersedes / Superseded By, when applicable

Existing documents may receive this metadata during an approved cleanup without rewriting their historical content.

## 11. Review and Audit

- Task review verifies that the selected documents are applicable and non-superseded.
- Milestone review verifies CURRENT_STATE.md, the roadmap, public documentation, and validation evidence.
- Architecture review verifies ADR and SDD/DMS alignment.
- A documentation governance audit verifies ownership, lifecycle, authority, links, contradictions, and implementation claims.
- Audit findings do not change authoritative documents automatically; changes follow CHANGE_POLICY.md.

## 12. Governing Principle

Planning describes intent. Code and tests describe implemented reality. CURRENT_STATE.md reports verified reality. None of them may silently redefine product scope or architecture.
