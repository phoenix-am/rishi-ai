# Rishi AI Documentation Change Policy

| Metadata | Value |
| :--- | :--- |
| **Purpose** | Define how repository documentation is created, reviewed, changed, frozen, superseded, and preserved |
| **Owner** | Repository Maintainer |
| **Lifecycle** | Current |
| **Authority** | Documentation governance |
| **Implementation Driver** | No |
| **Status** | Active |
| **Effective Date** | 2026-07-31 |

## 1. Governing Authority

All documentation changes must follow [DOCUMENT_AUTHORITY.md](DOCUMENT_AUTHORITY.md). This policy controls the mechanics of change; it cannot alter the permanent authority hierarchy or approve product and architecture decisions by itself.

## 2. General Change Rules

- Documentation changes require explicit task authorization.
- Never rewrite history to make an earlier document appear correct in retrospect.
- Separate factual current-state corrections from product, architecture, and planning changes.
- A lower-authority document cannot amend a higher-authority document.
- Planning language must not claim implementation.
- Implementation claims require source, schema, public API, test, and validation evidence.
- Every changed document must retain one lifecycle and an accountable owner.
- Do not delete historical material merely because it is stale.
- Do not stage, commit, push, publish, or deploy documentation without explicit authorization.

## 3. Editing Existing Documents

An existing document may be edited when:

- Its owner approves the change or a task contract explicitly authorizes it.
- The change is within the document's purpose and authority.
- Applicable higher-authority decisions have already been approved.
- The change identifies whether it is a correction, clarification, amendment, reconciliation, status update, or supersession.
- Links, lifecycle, ownership, and implementation claims are reviewed afterward.

Editorial corrections may fix formatting, spelling, encoding, and broken links without changing meaning. Any change to scope, behavior, architecture, responsibility, acceptance criteria, or priority is substantive and requires the corresponding approval.

## 4. Creating New Documents

Create a new document only when its information has a distinct owner and cannot be represented without duplicating an existing authority.

New governed documents must include:

- Purpose
- Owner
- Lifecycle
- Authority category or level
- Status
- Effective or last-reviewed date
- Supersedes / Superseded By, when applicable

The document must be added to [DOCUMENT_INDEX.md](DOCUMENT_INDEX.md) in the same authorized change.

## 5. Lifecycle Changes

Lifecycle changes require an evidence-based reason:

- **Draft → Current:** content is complete, approved, non-contradictory, and assigned to an owner.
- **Draft → Planning:** future guidance is approved but not implemented.
- **Planning → Current:** the document is now actively applicable; this does not by itself make its capability Implemented.
- **Current/Planning → Reference:** it remains useful but no longer drives work.
- **Any active lifecycle → Historical:** it records a superseded past state or plan.
- **Historical/Reference → Archive:** it no longer belongs in normal navigation but must be preserved.

Lifecycle changes must update DOCUMENT_INDEX.md. Historical and Archive classifications do not authorize file deletion or relocation.

## 6. Freezing Documents

Freezing is a status, not a lifecycle.

- A document may be frozen only by its approving authority.
- Frozen content changes only through an approved amendment, correction that does not change meaning, or supersession.
- Material changes must preserve the former approved state in Git and identify the new version or amendment.
- A frozen document may still be classified Current, Planning, Reference, or Historical.

## 7. Superseding Documents

When a document is replaced:

1. Approve the successor through the authority required for that category.
2. State the predecessor, successor, effective date, scope of supersession, and approver.
3. Classify the predecessor as Historical or Archive.
4. Update DOCUMENT_INDEX.md and all default reading paths.
5. Preserve the predecessor; do not delete or silently rewrite it.

Partial supersession must identify the exact affected sections. Unaffected sections retain their former authority only when the successor says so explicitly.

## 8. Product Requirements and Amendments

- The Product Owner approves all PRD changes.
- New requirements, removals, persona changes, revenue-model changes, and MVP boundary changes require an explicit amendment or new approved version.
- Implementation, TDDs, status files, and roadmaps cannot amend the PRD.
- An amendment must identify the affected requirement, rationale, effective date, and downstream documents requiring review.
- Product experiments may be authorized by a task contract, but permanent product scope must be recorded in the PRD or an amendment.

## 9. Architecture Decisions and ADRs

Create an ADR when a change affects:

- Package or module responsibility.
- Dependency direction or architectural boundaries.
- Public API or event-contract strategy.
- Database/storage technology or schema strategy.
- Authentication/authorization strategy.
- Execution, queueing, consistency, or deployment strategy.
- A material departure from the approved SDD, DMS, or active TDD.

ADRs are append-only decision records after approval. A changed decision requires a new ADR that supersedes the prior ADR. Emergency security remediation may precede an ADR only with explicit authorization; the decision record must follow promptly when the change is architectural rather than a compatible patch.

## 10. TDD Changes

- A TDD must state both design status and implementation status.
- `IMPLEMENTATION READY` never means `Implemented`.
- Before a TDD drives work, reconcile it with the PRD, applicable ADRs, current SDD/DMS, CURRENT_STATE.md, and code.
- Update a TDD when an approved implementation changes its contract, file placement, public API, data interaction, failure behavior, or verification criteria.
- If the implemented approach intentionally differs, record whether the TDD is amended, superseded, or retained as Historical.
- Do not retrofit unapproved implementation drift into a TDD merely to make documents agree.

## 11. Current-State Updates

Update [CURRENT_STATE.md](CURRENT_STATE.md) after:

- A successfully validated implementation or stabilization milestone.
- A repository audit that changes verified understanding.
- A material blocker is discovered or resolved.
- Public APIs, package inventory, schema state, or validation status materially changes.
- The active roadmap stage changes through approval.

CURRENT_STATE.md updates must include branch, revision, worktree context, date, validation scope, failures, warnings, and skipped checks. If validation is incomplete, the document must say so and must not claim a new successful baseline.

## 12. Roadmap and Status Changes

- The Product Owner approves roadmap priorities and milestone changes.
- Roadmaps describe future sequence and never prove implementation.
- Status changes require executable evidence and applicable validation.
- Historical phase labels remain historical; new planning must not reuse an old identifier for a different scope.
- A completed milestone with incomplete acceptance criteria must be reported as partial or reopened through an explicit owner decision.

## 13. README and Public Documentation Updates

Update an app, package, root, setup, API, or operations README when:

- Responsibilities or dependency boundaries change.
- Public exports, routes, commands, prerequisites, or configuration change.
- A described capability becomes implemented, partial, deferred, obsolete, or removed.
- A new engineer would otherwise receive incorrect setup or usage guidance.

README updates explain current usage. They do not replace PRD, ADR, SDD, TDD, roadmap, or current-state authority.

## 14. Required Update Triggers

| Trigger | Required Documentation Review |
| :--- | :--- |
| Successful implementation | CURRENT_STATE, affected README/API docs, applicable TDD, changelog/status when authorized |
| Architecture decision | New ADR, affected SDD/DMS/TDD, DOCUMENT_INDEX |
| Repository audit | CURRENT_STATE, DOCUMENT_INDEX classifications, cleanup backlog or approved audit report |
| Roadmap change | Forward roadmap, CURRENT_STATE stage, DOCUMENT_INDEX if lifecycle changes |
| Breaking public API/event change | ADR when architectural, TDD, API/reference docs, CURRENT_STATE |
| Database schema strategy change | ADR when architectural, SDD/DMS/TDD, migration documentation, CURRENT_STATE |
| Product requirement change | PRD amendment, affected architecture/TDD/roadmap review |
| Security policy or configuration change | Security/environment documentation, applicable ADR/TDD, CURRENT_STATE after validation |
| Document supersession | Successor/predecessor metadata and DOCUMENT_INDEX |

## 15. Documentation Review

Every authorized documentation change must verify:

- Purpose and owner remain correct.
- Exactly one lifecycle is assigned.
- Authority level matches DOCUMENT_AUTHORITY.md.
- Implementation status is supported by evidence.
- Terminology and naming are consistent.
- Internal links resolve to repository files.
- The change does not silently modify higher-authority scope.
- Historical material remains preserved.
- Applicable formatting and repository checks pass.

## 16. Repository Documentation Audits

A governance audit should evaluate:

- Accuracy against source, schemas, public APIs, and tests.
- Cross-document contradictions.
- Ownership and approval gaps.
- Lifecycle and authority classification.
- Broken links, duplicate roots, and discoverability.
- Stale implementation and phase claims.
- Missing required governance or operational documentation.

Audit output is analysis until an authorized cleanup task applies it. An audit must not rewrite documents automatically.

## 17. Change Completion

A documentation change is complete only when:

1. Authorized scope is satisfied.
2. Required approvals are recorded.
3. Affected indexes and lifecycle metadata are consistent.
4. Links and terminology are verified.
5. Applicable validation has actually run and results are reported.
6. No unrelated historical or implementation material changed.

Git staging, commits, pushes, releases, or publication remain separate authorized actions.
