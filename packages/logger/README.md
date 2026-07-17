# `@rishi/logger`

Central structured JSON logger engine using Pino.

## Responsibilities

- Houses the logging interface, Pino bootstrap, correlation IDs, and logger factory.
- **Must never own:** Business specific logs, file writers, or network telemetry sinks.

## Dependencies

- **Allowed Dependencies:** `@rishi/config`, `@rishi/shared`, `pino` (third party).
- **Forbidden Dependencies:** All other workspace packages.

## Public API

Exposes the logger interface `ILogger` and the `LoggerFactory`.
