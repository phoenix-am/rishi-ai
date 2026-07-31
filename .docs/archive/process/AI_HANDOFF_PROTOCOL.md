# AI_HANDOFF_PROTOCOL.md

> **Version:** 1.0.0
>
> **Status:** Active
>
> **Owner:** Rishi AI Founder & CTO
>
> **Purpose:** Defines how engineering work is handed over between AI agents without losing architectural context, implementation state, or project continuity.

---

# Philosophy

Every AI agent must assume that another AI agent may continue the project at any time.

The repository—not the conversation—is the source of truth.

No implementation should rely on conversational memory.

---

# Mandatory Reading Order

Before performing any work, an AI agent must read:

1. ENGINEERING_AGENT.md
2. COMMANDS.md
3. WORKFLOWS.md
4. CHECKLISTS.md
5. DEFINITION_OF_DONE.md
6. IMPLEMENTATION_PROTOCOL.md
7. PROJECT_STATUS.md
8. Engineering Execution Plan (EEP)

Then read only the documents relevant to the requested task (PRD, SDD, TDDs, ADRs, etc.).

---

# Source of Truth

The following take precedence in order:

1. Repository implementation
2. Architecture documents
3. Technical Design Documents
4. PROJECT_STATUS.md
5. User instructions

Conversation history must never override repository state.

---

# Before Starting Work

Every AI agent must determine:

- Current Phase
- Current Milestone
- Active Blockers
- Dependencies
- Current Branch
- Existing Implementation
- Open Architectural Decisions

If any of these are unclear, stop and report the ambiguity.

---

# Implementation Handoff

Every completed implementation must include:

## Scope Completed

- What was implemented
- What files changed
- What was intentionally deferred

---

## Verification

Include:

- Build
- Lint
- Typecheck
- Tests
- CI status

---

## Git

Include:

- Branch
- Commit SHA
- Commit Message
- Push Status

---

## Documentation

Specify every updated document.

Examples:

- PROJECT_STATUS.md
- TDD-005
- ADR-003

---

## Next Recommended Task

Clearly identify:

- Next Phase
- Next Milestone
- Next Module
- Known Risks
- Dependencies

The next AI agent should be able to continue immediately.

---

# Incomplete Work

If work is incomplete, report:

## Completed

...

## Remaining

...

## Blockers

...

## Risks

...

Do not claim completion.

---

# Architecture Changes

Whenever architecture changes:

- Update ADR
- Update SDD (if required)
- Update affected TDD
- Update PROJECT_STATUS

Never leave architecture undocumented.

---

# Context Preservation

AI agents must never assume previous conversation memory.

All important information must exist inside the repository.

If information exists only in chat, it must first be documented before implementation continues.

---

# Repository Synchronization

After implementation:

- Update documentation
- Update PROJECT_STATUS
- Verify roadmap
- Commit
- Push

Repository state must always represent reality.

---

# Forbidden Practices

Never:

- Depend on chat history
- Leave undocumented architectural changes
- Skip PROJECT_STATUS updates
- Skip verification
- Skip documentation
- Guess project state

---

# Completion Rule

A handoff is considered complete only when another AI agent can continue the project using **only the repository contents**, without requiring additional conversational context.

If that is not possible, the handoff is incomplete.