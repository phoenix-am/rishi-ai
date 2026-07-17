# Husky Git Hooks Configuration

This directory documents the Git hook settings configured at the root `.husky/` directory.

## Hooks Configured

- **`pre-commit`**: Executes `lint-staged` to run ESLint, Prettier, and TypeScript checks on staged modifications.
- **`commit-msg`**: Validates commit messages using `commitlint` to match Conventional Commits specifications.
