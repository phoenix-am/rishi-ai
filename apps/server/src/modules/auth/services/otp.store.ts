import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { createHash, randomInt } from "crypto";

interface StoredOtp {
  hash: string;
  expiresAt: Date;
}

@Injectable()
export class InMemoryOtpStore implements OnModuleDestroy {
  private readonly otps = new Map<string, StoredOtp>();
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupExpiredOtps();
      },
      5 * 60 * 1000
    );
  }

  public onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Iterates through all stored OTPs and deletes those that have expired.
   */
  private cleanupExpiredOtps(): void {
    const now = Date.now();
    for (const [email, entry] of this.otps.entries()) {
      if (now > entry.expiresAt.getTime()) {
        this.otps.delete(email);
      }
    }
  }

  /**
   * Generates a cryptographically secure 6-digit verification code,
   * hashes it, stores it in memory with a TTL, and returns the plain code.
   *
   * @param email - The target email address
   * @param ttlMs - Time-to-live in milliseconds (defaults to 5 minutes)
   * @returns The raw 6-digit numeric OTP code
   */
  public generateAndStore(email: string, ttlMs = 5 * 60 * 1000): string {
    const normalizedEmail = this.normalize(email);
    const code = randomInt(100000, 999999).toString();
    const hash = this.hashOtp(code);
    const expiresAt = new Date(Date.now() + ttlMs);

    this.otps.set(normalizedEmail, { hash, expiresAt });
    return code;
  }

  /**
   * Verifies the provided OTP code against the stored hash for the given email.
   * Clears the OTP code on success or mismatch to prevent replay/brute-force attacks.
   *
   * @param email - Recipient email
   * @param code - Input code to verify
   * @returns True if the code matches and is not expired, false otherwise
   */
  public verifyAndConsume(email: string, code: string): boolean {
    const normalizedEmail = this.normalize(email);
    const entry = this.otps.get(normalizedEmail);

    if (!entry) {
      return false;
    }

    // Always delete the OTP immediately to prevent replay/brute-force
    this.otps.delete(normalizedEmail);

    if (Date.now() > entry.expiresAt.getTime()) {
      return false;
    }

    const inputHash = this.hashOtp(code);
    return inputHash === entry.hash;
  }

  /**
   * Hashes the raw OTP string using SHA-256.
   */
  private hashOtp(code: string): string {
    return createHash("sha256").update(code).digest("hex");
  }

  /**
   * Normalizes the email address string.
   */
  private normalize(email: string): string {
    return email.trim().toLowerCase();
  }
}
