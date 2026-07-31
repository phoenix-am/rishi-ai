# `apps/client`

The React 19 and Vite browser application for Rishi AI.

## Current State

The application builds and renders a static scaffold. It does not yet provide a usable customer workflow, document editor, authentication flow, asset interface, or production dashboard.

## Intended Responsibility

- Present project and workflow state received from the server.
- Provide the approved content-production workspace and review experience.
- Consume public server APIs and event streams.
- Keep credentials, persistence, background execution, and business authorization on the server.

Intended responsibility is not evidence of implementation. See [CURRENT_STATE.md](../../.docs/CURRENT_STATE.md) and [TDD-021](../../.docs/tdds/TDD-021_Client_View_App.md).

## Technology

- React
- Vite
- TypeScript
- Tailwind CSS

The application entry point is `src/main.tsx`; the current shell is defined in `src/App.tsx`.
