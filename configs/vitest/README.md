# Vitest Configuration

Contains the shared base test configuration settings for workspace packages and apps.

## Configuration Details

- **Globals**: Enabled (no need to import `describe`, `it`, `expect` in tests).
- **Environment**: Default to `node` for backend modules and workspace packages.
- **Coverage**: Configured using `v8` provider and HTML/JSON report formats.
