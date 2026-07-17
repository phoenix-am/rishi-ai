# `apps/client`

The frontend application client for Rishi AI.

## Responsibilities

- Render the main content production editor, workflow dashboards, and asset panels.
- **Must never own:** Raw backend file writing, background task orchestration, or credential hashing algorithms.

## Styling & Theme Architecture

- **Framework:** React + Vite + TypeScript.
- **Styling System:** Tailwind CSS v4 (configured CSS-first in `src/index.css`).
- **UI Base:** shadcn/ui configuration with custom CSS theme tokens in `components.json`.

## Dependencies

- `@rishi/domain`
- `@rishi/shared`
- `react`
- `react-dom`
- `lucide-react`
- `@radix-ui/react-slot`
- `tailwindcss` (v4)
- `@tailwindcss/vite`
