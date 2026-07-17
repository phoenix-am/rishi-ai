# TDD-006: Auth Module Technical Specification

## 1. Metadata & Status Block

| Metadata Field | Value |
| :--- | :--- |
| **Document ID** | TDD-006 |
| **Module Name** | AuthModule |
| **Version** | v1.0.0 |
| **Status** | IMPLEMENTATION READY |
| **EEP Phase Position** | Phase 3: Identity & Extensible Authorization (Module 3.1) |
| **Exact Prerequisites** | [TDD-004](file:///c:/Users/Anmol/Desktop/rishi-ai/.docs/tdds/TDD-004_Database_Module.md) (DatabaseModule) |

---

## 2. Technical Architecture Overview

The `AuthModule` enforces the secure stateless perimeter of Rishi AI. It coordinates passwordless email OTP (One-Time Password) generation, verifies sign-in tokens, manages federated Google OAuth flows, and issues RS256-signed JSON Web Tokens (JWT) embedded within HTTP-only, secure cookies.

### File Placement Layout
```text
src/
└── server/
    └── modules/
        └── auth/
            ├── auth.module.ts          # NestJS module setup
            ├── auth.controller.ts      # Auth endpoints handler
            ├── auth.service.ts         # Business logic for OTP & OAuth
            ├── jwt.strategy.ts         # Passport RS256 token verification logic
            └── strategies/
                └── google.strategy.ts  # Google OAuth2 handler
```

### Framework Integration Strategy
- **Authentication Guard:** Standardized as `JwtAuthGuard` mapping to Passport validation profiles.
- **Asymmetric Signature Protocol (RS256):** Prevents credential forgery. Requires private keys at host startup (injected via `ConfigModule`) to sign tokens, while public keys verify inbound cookies at scale.

---

## 3. Interface & Contract Specification

### Auth Service Contracts (`auth.service.ts`)
```typescript
export interface OtpGenerationPayload {
  email: string;
}

export interface OtpVerificationPayload {
  email: string;
  code: string;
}

export interface GoogleSessionPayload {
  email: string;
  googleId: string;
  firstName?: string;
  lastName?: string;
}

export interface IAuthService {
  /**
   * Generates a cryptographically secure 6-digit verification code,
   * stores it in a transient PostgreSQL OTP verification table or in-memory map, and dispatches an email to the user.
   */
  requestPasswordlessOtp(payload: OtpGenerationPayload): Promise<void>;

  /**
   * Validates OTP code correctness. If correct, retrieves/creates the Creator profile
   * and generates signed RS256 stateless cookie token payloads.
   */
  verifyPasswordlessOtp(payload: OtpVerificationPayload): Promise<{ token: string }>;

  /**
   * Manages Google OAuth callbacks, matching emails to Creator profiles.
   */
  handleGoogleLoginCallback(payload: GoogleSessionPayload): Promise<{ token: string }>;
}
```

---

## 4. Data & Schema Integration

- **Relational Tables Altered:** Creates profiles inside the `creators` table if a new email logs in.
- **Database Interrelation:**
  - `creators`: Looks up `email` uniquely. Inserts record on new signups.
- **Transactional State:** Creator insertion commits inside transactional blocks atomically.

---

## 5. Detailed Lifecycle & Error Matrix

### Passwordless Email OTP Lifecycle Flow

```mermaid
sequenceDiagram
    participant C as Creator (User Browser)
    participant API as AuthController
    participant S as AuthService
    participant DB as Database (creators)
    participant E as Email Provider (SMTP)

    C->>API: POST /api/v1/auth/otp/request {email: "founder@rishi.ai"}
    API->>S: requestPasswordlessOtp("founder@rishi.ai")
    S->>S: Generate cryptographically secure 6-digit code (e.g. "589321")
    S->>S: Store "otp:founder@rishi.ai" = "589321" (Expiring in 5 minutes)
    S->>E: Send Email with OTP code
    API-->>C: 200 OK (OTP Sent successfully)
    
    C->>API: POST /api/v1/auth/otp/verify {email: "founder@rishi.ai", code: "589321"}
    API->>S: verifyPasswordlessOtp("founder@rishi.ai", "589321")
    alt Code Matches
        S->>DB: Select Creator where email = "founder@rishi.ai"
        alt Creator doesn't exist
            S->>DB: Insert Creator returning CreatorEntity
        end
        S->>S: Sign RS256 JWT containing creatorId
        S-->>API: Return signed JWT
        API-->>C: Set-Cookie: token=<jwt>; HttpOnly; Secure; SameSite=Strict
    else Code Mismatch / Expired
        S-->>API: Throw InvalidOtpException
        API-->>C: 401 Unauthorized
    end
```

### Error Matrix

| Error Code / Name | Failure Type | Triggers / Condition | System Response / Recovery Action |
| :--- | :--- | :--- | :--- |
| `InvalidOtpException` | **FATAL** (Request) | OTP code passed does not match stored value, or OTP duration has expired. | Rejects with 401 response, increments tracking try counts to block brute force attempts. |
| `OAuthCallbackException` | Transient | Google OAuth validation fails due to network dropout during token lookup. | Redirects user to `/login?error=oauth_failed` allowing manual re-auth loops. |

---

## 6. Testing & Validation Criteria

### Unit Mocking Boundaries
- Mock OTP storage layers (to test code storage and expiration rules).
- Mock database queries to verify that user profiles are created only on first signup.

### Vitest Assertions
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let authService: AuthService;
  let mockCreatorsRepository: any;
  let mockCache: Map<string, string>;

  beforeEach(() => {
    mockCache = new Map();
    mockCreatorsRepository = {
      findByEmail: vi.fn(),
      create: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'creator-uuid', ...data })),
    };

    authService = new AuthService(mockCreatorsRepository as any, mockCache as any);
  });

  it('should successfully store code and verify a correct OTP', async () => {
    // Stage OTP in mock cache
    mockCache.set('otp:founder@rishi.ai', '123456');
    mockCreatorsRepository.findByEmail.mockResolvedValue({ id: 'creator-uuid', email: 'founder@rishi.ai' });

    const result = await authService.verifyPasswordlessOtp({
      email: 'founder@rishi.ai',
      code: '123456',
    });

    expect(result).toBeDefined();
    expect(mockCreatorsRepository.findByEmail).toHaveBeenCalledWith('founder@rishi.ai');
    expect(mockCreatorsRepository.create).not.toHaveBeenCalled(); // Already exists
  });

  it('should create new creator on verification if profile is missing', async () => {
    mockCache.set('otp:new-user@rishi.ai', '654321');
    mockCreatorsRepository.findByEmail.mockResolvedValue(null); // New user

    await authService.verifyPasswordlessOtp({
      email: 'new-user@rishi.ai',
      code: '654321',
    });

    expect(mockCreatorsRepository.create).toHaveBeenCalledWith({ email: 'new-user@rishi.ai' });
  });
});
```
