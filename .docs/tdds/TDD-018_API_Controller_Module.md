# TDD-018: API Controller Module Technical Specification

## 1. Metadata & Status Block

| Metadata Field | Value |
| :--- | :--- |
| **Document ID** | TDD-018 |
| **Module Name** | ApiControllerModule |
| **Version** | v1.0.0 |
| **Status** | IMPLEMENTATION READY |
| **Lifecycle** | Reference |
| **Implementation Status** | Partially Implemented |
| **Owner** | Unassigned |
| **Current Authority** | Level 9 — Technical design reference |
| **Last Verified** | 2026-07-31 |
| **EEP Phase Position** | Phase 8: API Interfaces & Client Shell (Module 8.1) |
| **Exact Prerequisites** | [TDD-007](TDD-007_Authorization_Module.md) (AuthorizationModule), [TDD-014](TDD-014_Script_Structure_Module.md) (ScriptStructureModule), [TDD-017](TDD-017_Compliance_Validation_Module.md) (ComplianceValidationModule) |

---

## 2. Technical Architecture Overview

The `ApiControllerModule` defines the network entry points for Rishi AI. Configured exclusively under the Fastify Adapter to minimize memory overhead, it enforces versioned paths (`/api/v1/*`), binds requests to authentication guards, applies Zod input validation schemas, wraps responses in standard JSON envelopes, and validates mutation idempotency keys.

### File Placement Layout
```text
src/
└── server/
    └── shared/
        └── api/
            ├── api-controller.module.ts # NestJS controller module wrapper
            ├── interceptors/
            │   └── envelope.interceptor.ts # Global JSON envelope decorator
            ├── filters/
            │   └── http-exception.filter.ts # Global exception logger & parser
            ├── guards/
            │   └── idempotency.guard.ts     # Mutation idempotency checker
            └── controllers/
                ├── project.controller.ts    # Example workspace controller
                └── asset.controller.ts      # Example library controller
```

### Framework Integration Strategy
- **Fastify Adapting:** Runs over Fastify to guarantee high throughput and low latency.
- **Envelope Mapping Interceptor:** Registered globally to intercept successful method execution outputs, formatting payloads into the standardized network contract envelope.

---

## 3. Interface & Contract Specification

### Unified Response Envelope
```typescript
export interface ApiResponseEnvelope<T = any> {
  success: boolean;
  data: T;
  meta: {
    correlationId: string;
    payloadVersion: string;
  };
  error: {
    code: string;
    message: string;
    details?: any;
  } | null;
}
```

### Idempotency Guard Interface (`idempotency.guard.ts`)
```typescript
import { CanActivate, ExecutionContext, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class IdempotencyGuard implements CanActivate {
  constructor(private readonly idempotencyService: any) {} // Injected idempotency service (backed by PostgreSQL or in-memory map)

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const key = request.headers['x-idempotency-key'];

    if (request.method !== 'POST' && request.method !== 'PUT') {
      return true; // Skip for non-mutation queries
    }

    if (!key) {
      throw new BadRequestException('Missing header: X-Idempotency-Key is required for mutations.');
    }

    const hasBeenProcessed = await this.idempotencyService.get(`idemp:${key}`);
    if (hasBeenProcessed) {
      throw new BadRequestException('Request conflict: Duplicate idempotency key detected.');
    }

    // Set expiration lock (e.g. locks key for 60 seconds)
    await this.idempotencyService.set(`idemp:${key}`, 'locked', 60);
    return true;
  }
}
```

---

## 4. Data & Schema Integration

- **Relational Tables Interacted:** Indirectly invokes Drizzle updates for projects/script blocks. Queries/inserts key records in the `idempotency_keys` table.
- **Idempotency Lock:** Uses a transient PostgreSQL table (`idempotency_keys`) or in-memory map to lock `x-idempotency-key` strings. Keys automatically expire after 60 seconds (or are cleaned up via database retention rules).

---

## 5. Detailed Lifecycle & Error Matrix

### Request Lifecycle Pipeline

```
[ Incoming Network Request ]
             │
             ▼
 1. Fastify Native Border ──────► Parse Cookie Payload & Verify RS256 Stateless JWT Integrity
             │
             ▼
 2. CreatorIsolationGuard ──────► Assert validated User ID owns targeted unique Project Aggregate
             │
             ▼
 3. Idempotency Guard ──────────► Verify X-Idempotency-Key does not exist in DB/memory lock map
             │
             ▼
 4. Zod Schema Filter ──────────► Enforce strict validation constraints and extract Payload Versions
             │
             ▼
 5. NestJS Controller Core ─────► Execute logical service layer routines using in-process event buses
             │
             ▼
 6. Envelope Interceptor ───────► Wrap return payload into standard JSON response envelope
             │
             ▼
 7. Global Exception Filter ────► Catch errors, map Correlation IDs, format standard Error payload
```

### Error Matrix

| Error Code / Name | Failure Type | Triggers / Condition | System Response / Recovery Action |
| :--- | :--- | :--- | :--- |
| Duplicate Idempotency Key | **FATAL** (Request) | Creator double-submits a script rewrite payload using the same header key due to click double-tap. | Rejects request instantly, returning 400 Bad Request to prevent duplicate background job dispatching. |
| Global Exception Leak | Transient | Uncaught service exceptions bubble up to controller layer (e.g., database connection drops). | Interceptor catches exception, hides internal Postgres call traces, logs with Pino correlation, and returns standard HTTP 500 error envelope. |

---

## 6. Testing & Validation Criteria

### Unit Mocking Boundaries
- Mock `idempotencyService` to test key lock validations.
- Mock Controller services to verify HTTP route interceptors format error objects matching the API envelope.

### Vitest Assertions
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IdempotencyGuard } from './guards/idempotency.guard';
import { ExecutionContext, BadRequestException } from '@nestjs/common';

describe('IdempotencyGuard header validations', () => {
  let guard: IdempotencyGuard;
  let mockIdempotencyService: any;

  beforeEach(() => {
    mockIdempotencyService = {
      get: vi.fn(),
      set: vi.fn(),
    };
    guard = new IdempotencyGuard(mockIdempotencyService);
  });

  it('should throw BadRequestException if X-Idempotency-Key is missing on POST requests', async () => {
    const mockContext = createMockContext('POST', {});

    await expect(guard.canActivate(mockContext)).rejects.toThrow(BadRequestException);
  });

  it('should block execution if X-Idempotency-Key is already present in cache', async () => {
    mockIdempotencyService.get.mockResolvedValue('locked');
    const mockContext = createMockContext('POST', { 'x-idempotency-key': 'duplicate-key-123' });

    await expect(guard.canActivate(mockContext)).rejects.toThrow(BadRequestException);
  });

  it('should allow execution and lock key if key is new', async () => {
    mockIdempotencyService.get.mockResolvedValue(null);
    const mockContext = createMockContext('POST', { 'x-idempotency-key': 'new-key-456' });

    const allowed = await guard.canActivate(mockContext);

    expect(allowed).toBe(true);
    expect(mockIdempotencyService.set).toHaveBeenCalledWith('idemp:new-key-456', 'locked', 60);
  });

  function createMockContext(method: string, headers: Record<string, string>): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          headers,
        }),
      }),
    } as any;
  }
});
```
