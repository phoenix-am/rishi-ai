# TDD-001: Config Module Technical Specification

## 1. Metadata & Status Block

| Metadata Field | Value |
| :--- | :--- |
| **Document ID** | TDD-001 |
| **Module Name** | ConfigModule |
| **Version** | v1.0.0 |
| **Status** | IMPLEMENTATION READY |
| **EEP Phase Position** | Phase 1: Core Foundation & Cross-Cutting Concerns (Module 1.1) |
| **Exact Prerequisites** | None (Empty Repository State) |

---

## 2. Technical Architecture Overview

The `ConfigModule` is responsible for parsing, validating, and supplying configuration parameters throughout the NestJS modular monolith. It wraps environment variables at startup, preventing the application from running with missing or misconfigured settings.

### File Placement Layout
```text
src/
└── server/
    └── shared/
        └── config/
            ├── config.module.ts       # NestJS module declaration
            ├── config.service.ts      # Custom service wrapping Zod-parsed schema
            ├── env.schema.ts          # Zod schema definitions
            └── errors/
                └── config-validation.exception.ts # Custom fatal startup exception
```

### Framework Integration Strategy
- **Global Module:** Marked as `@Global()` to ensure a single instance is shared across all downstream modules without manual imports.
- **Provider Injection Token:** Exposed via the standard class token `ConfigService` rather than a string symbol, allowing constructor-based injection: `constructor(private readonly configService: ConfigService)`.
- **Eager Bootstrap Validation:** Validated dynamically inside `main.ts` before the NestJS application starts listening on the network port.

---

## 3. Interface & Contract Specification

### Environment Variable Zod Schema (`env.schema.ts`)
```typescript
import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  PRIMARY_AI_PROVIDER: z.enum(['gemini', 'openai', 'deepseek', 'ollama']),
  AES_MASTER_KEY: z.string().length(64, {
    message: 'AES_MASTER_KEY must be a hex-encoded string of exactly 64 characters (256 bits)',
  }),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

export type EnvConfig = z.infer<typeof envSchema>;
```

### Config Service Interface (`config.service.ts`)
```typescript
import { Injectable } from '@nestjs/common';
import { EnvConfig } from './env.schema';

@Injectable()
export class ConfigService {
  private readonly envConfig: EnvConfig;

  constructor(env: Record<string, unknown> = process.env) {
    this.envConfig = this.validateEnv(env);
  }

  private validateEnv(env: Record<string, unknown>): EnvConfig {
    const result = envSchema.safeParse(env);
    if (!result.success) {
      // Throw fatal exception containing validation errors
      throw new ConfigValidationException(result.error);
    }
    return result.data;
  }

  public get<T extends keyof EnvConfig>(key: T): EnvConfig[T] {
    return this.envConfig[key];
  }
}
```

---

## 4. Data & Schema Integration

- **Relational Tables Altered:** None. The `ConfigModule` interacts exclusively with system environment variables (`process.env`) and configuration files (`.env`).
- **Database Index Impact:** None.
- **Transactional State:** None. This module operates entirely in volatile memory at startup.

---

## 5. Detailed Lifecycle & Error Matrix

### Bootstrap Parsing & Validation Lifecycle Flow

```mermaid
sequenceDiagram
    participant OS as System Environment (process.env)
    participant Boot as NestJS main.ts (Bootstrap)
    participant Module as ConfigModule
    participant Service as ConfigService
    participant Zod as Zod Schema Validation

    Boot->>Module: Instantiate Module
    Module->>Service: Inject ConfigService
    Service->>OS: Read Environment Variables
    Service->>Zod: safeParse(process.env)
    alt Validation Success
        Zod-->>Service: Return Parsed & Casted EnvConfig
        Service-->>Boot: Module Loaded Cleanly
        Boot->>Boot: Start App Listener (PORT)
    else Validation Failure (Missing/Invalid Keys)
        Zod-->>Service: Return ZodError details
        Service->>Service: Throw ConfigValidationException
        Service-->>Boot: Bubble up Exception
        Boot->>Boot: Write structured JSON error to stdout
        Boot->>Boot: Call process.exit(1)
    end
```

### Custom Exception: `ConfigValidationException`
```typescript
import { ZodError } from 'zod';

export class ConfigValidationException extends Error {
  public readonly errors: Record<string, string[]>;

  constructor(zodError: ZodError) {
    const errors = zodError.flatten().fieldErrors;
    const formattedMessage = `[Fatal] Environment configuration validation failed: ${JSON.stringify(errors)}`;
    super(formattedMessage);
    this.name = 'ConfigValidationException';
    this.errors = errors;
  }
}
```

### Error Matrix

| Error Code / Name | Failure Type | Triggers / Condition | System Response / Recovery Action |
| :--- | :--- | :--- | :--- |
| `ConfigValidationException` | **FATAL** | A required key (e.g. `DATABASE_URL`) is missing, or does not conform to the schema constraints. | Emits detailed validation failures to stdout, aborts bootstrap, and invokes `process.exit(1)`. |
| Dynamic Type Mismatch | **FATAL** | `PORT` is passed as a non-numeric string (e.g. "abc"). | Zod fails coercion, throws validation error, terminating the runtime process. |

---

## 6. Testing & Validation Criteria

### Unit Mocking Boundaries
- Tests must isolate `ConfigService` by passing custom key-value mocks to the constructor rather than relying on system-wide `process.env`.

### Vitest Assertions
```typescript
import { describe, it, expect } from 'vitest';
import { ConfigService } from './config.service';
import { ConfigValidationException } from './errors/config-validation.exception';

describe('ConfigService', () => {
  it('should successfully parse and cast valid environment variables', () => {
    const validEnv = {
      NODE_ENV: 'development',
      PORT: '4000',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/rishi_ai',
      PRIMARY_AI_PROVIDER: 'gemini',
      AES_MASTER_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      LOG_LEVEL: 'debug',
    };

    const config = new ConfigService(validEnv);
    expect(config.get('PORT')).toBe(4000); // Coerced to number
    expect(config.get('NODE_ENV')).toBe('development');
    expect(config.get('AES_MASTER_KEY')).toHaveLength(64);
  });

  it('should throw ConfigValidationException on invalid environment values', () => {
    const invalidEnv = {
      NODE_ENV: 'production',
      PORT: 'not-a-number',
      DATABASE_URL: 'invalid-url',
      PRIMARY_AI_PROVIDER: 'unknown-provider',
      AES_MASTER_KEY: 'short-key',
    };

    expect(() => new ConfigService(invalidEnv)).toThrow(ConfigValidationException);
  });
});
```
