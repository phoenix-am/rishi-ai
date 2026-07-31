# Rishi AI Engineering Rulebook

| Metadata | Value |
| :--- | :--- |
| **Purpose** | Define the engineering standards applied to authorized repository work |
| **Owner** | Product Owner |
| **Lifecycle** | Current |
| **Authority** | Level 9 engineering process reference |
| **Implementation Driver** | No |
| **Status** | Active |
| **Last Reviewed** | 2026-07-31 |

## 1. Authority and Scope

The approved task contract controls the scope of one task. Product decisions, architecture decisions, implemented reality, documentation authority, and current status remain governed by [DOCUMENT_AUTHORITY.md](../DOCUMENT_AUTHORITY.md).

This rulebook does not authorize product scope, architecture changes, Git operations, releases, deployments, or external communication.

## 2. Core Engineering Standards

- Preserve the modular-monolith architecture and existing package responsibilities.
- Follow public package APIs and dependency direction; do not import sibling internals.
- Keep domain code independent of frameworks and persistence details.
- Use dependency injection at application boundaries.
- Validate structured inputs before execution.
- Prefer deterministic behavior and explicit failure states.
- Use structured logging without secrets or credential-bearing values.
- Preserve transaction, tenant-isolation, and authorization boundaries.
- Keep changes bounded to the approved task and avoid unrelated refactors.
- Add or update tests for changed behavior.

## 3. Work Sequence

For each authorized task:

1. Inspect the worktree and preserve unrelated changes.
2. Read the applicable authority, current state, product requirement, ADR, architecture, and TDD material.
3. Confirm scope, exclusions, dependencies, risks, acceptance criteria, and validation commands.
4. Stop and report a material product or architecture conflict instead of resolving it silently.
5. Implement the smallest compatible change through existing public boundaries.
6. Review the resulting diff for scope, security, correctness, and documentation impact.
7. Run every applicable validation command.
8. Report actual changes, validation, remaining risks, and recommendations separately.

## 4. Architecture Changes

Follow [CHANGE_POLICY.md](../CHANGE_POLICY.md) when work changes package responsibility, dependency direction, public APIs, event contracts, schema strategy, authentication, execution, queueing, or another load-bearing architectural decision.

Do not disguise an architectural change as cleanup or implementation detail.

## 5. Definition of Done

A task is complete only when:

- Approved acceptance criteria are satisfied.
- The implementation remains within scope and package boundaries.
- Applicable tests cover changed behavior.
- Required validation has actually passed or failures are reported accurately.
- Current documentation remains consistent with behavior.
- Historical material and unrelated work remain preserved.
- No unauthorized Git, release, deployment, or external action occurred.

Compilation or passing tests alone are not sufficient when other acceptance criteria remain incomplete.

## 6. Validation and Reporting

Use the commands defined by the repository and task contract. Never suppress failures, lower required thresholds, or claim unexecuted validation.

Completion reports must distinguish:

- Changes introduced by the task.
- Pre-existing worktree changes.
- Passed validation.
- Warnings and failures.
- Risks and deferred recommendations.

## 7. Working Principle

Planning describes intent. Executable evidence describes reality. Engineering work changes reality only within explicit authorization.
