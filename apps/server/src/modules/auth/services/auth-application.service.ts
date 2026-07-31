import { Injectable, Inject, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { isEmail } from "class-validator";
import {
  DatabaseService,
  users,
  workspaces,
  workspaceMembers,
  sessions,
  type DatabaseClient,
} from "@rishi/database";
import { TransactionManager } from "@rishi/transaction";
import {
  EMAIL_PROVIDER,
  type AuthTokens,
  type DeviceMetadata,
  type GoogleSessionPayload,
  type IAuthService,
  type IEmailProvider,
  type OtpGenerationPayload,
  type OtpVerificationPayload,
} from "@rishi/auth";
import { InMemoryOtpStore } from "./otp.store.js";
import { JwtTokenService } from "./jwt-token.service.js";
import { InvalidOtpException, OAuthCallbackException } from "../auth.exceptions.js";

import { eq, and } from "drizzle-orm";
import { randomBytes, createHash } from "crypto";

export interface TokenPayload extends Record<string, unknown> {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class AuthApplicationService implements IAuthService {
  constructor(
    @Inject(DatabaseService) private readonly dbService: DatabaseService,
    @Inject(TransactionManager) private readonly txManager: TransactionManager,
    @Inject("DRIZZLE_CLIENT") private readonly drizzleClient: { db: DatabaseClient },
    @Inject(InMemoryOtpStore) private readonly otpStore: InMemoryOtpStore,
    @Inject(EMAIL_PROVIDER) private readonly emailProvider: IEmailProvider,
    @Inject(JwtTokenService) private readonly tokenService: JwtTokenService
  ) {}

  /**
   * Generates a passwordless OTP and sends it via the email provider.
   */
  public async requestPasswordlessOtp(payload: OtpGenerationPayload): Promise<void> {
    const normalized = payload.email.trim().toLowerCase();
    if (!isEmail(normalized) || normalized.length > 254) {
      throw new BadRequestException("A valid email address is required.");
    }
    const code = this.otpStore.generateAndStore(normalized);
    try {
      await this.emailProvider.sendOtp(normalized, code);
    } catch (error) {
      this.otpStore.delete(normalized);
      throw error;
    }
  }

  /**
   * Verifies the OTP, registers/retrieves the user, initializes their default workspace,
   * creates a new session, and returns the tokens.
   */
  public async verifyPasswordlessOtp(
    payload: OtpVerificationPayload,
    deviceMetadata: DeviceMetadata = {}
  ): Promise<AuthTokens> {
    const normalized = payload.email.trim().toLowerCase();
    if (!isEmail(normalized) || normalized.length > 254 || !/^\d{6}$/u.test(payload.code)) {
      throw new InvalidOtpException();
    }
    const isValid = this.otpStore.verifyAndConsume(normalized, payload.code);

    if (!isValid) {
      throw new InvalidOtpException();
    }

    return this.authenticateIdentity(normalized, deviceMetadata);
  }

  public async handleGoogleLoginCallback(
    payload: GoogleSessionPayload,
    deviceMetadata: DeviceMetadata = {}
  ): Promise<AuthTokens> {
    const normalizedEmail = payload.email.trim().toLowerCase();
    if (!payload.googleId || !isEmail(normalizedEmail) || normalizedEmail.length > 254) {
      throw new OAuthCallbackException();
    }
    return this.authenticateIdentity(normalizedEmail, deviceMetadata);
  }

  private async authenticateIdentity(
    normalizedEmail: string,
    deviceMetadata: DeviceMetadata
  ): Promise<AuthTokens> {
    return this.txManager.runInTransaction<AuthTokens>(this.drizzleClient.db, async () => {
      let dbUser = await this.findUserByEmail(normalizedEmail);

      if (!dbUser) {
        // Register new user
        const [insertedUser] = await this.dbService.client
          .insert(users)
          .values({
            email: normalizedEmail,
            role: "user",
          })
          .returning();

        if (!insertedUser) {
          throw new Error("Failed to register new user.");
        }

        // Initialize personal workspace
        const [insertedWorkspace] = await this.dbService.client
          .insert(workspaces)
          .values({
            name: `${normalizedEmail}'s Workspace`,
            ownerId: insertedUser.id,
          })
          .returning();

        if (!insertedWorkspace) {
          throw new Error("Failed to create default workspace.");
        }

        // Add user as workspace owner
        await this.dbService.client.insert(workspaceMembers).values({
          userId: insertedUser.id,
          workspaceId: insertedWorkspace.id,
          role: "owner",
        });

        dbUser = insertedUser;
      } else {
        // User exists, verify they have at least one workspace membership
        const memberships = await this.dbService.client
          .select()
          .from(workspaceMembers)
          .where(eq(workspaceMembers.userId, dbUser.id))
          .limit(1);

        if (memberships.length === 0) {
          // Fallback: create default workspace if somehow missing
          const [insertedWorkspace] = await this.dbService.client
            .insert(workspaces)
            .values({
              name: `${normalizedEmail}'s Workspace`,
              ownerId: dbUser.id,
            })
            .returning();

          if (insertedWorkspace) {
            await this.dbService.client.insert(workspaceMembers).values({
              userId: dbUser.id,
              workspaceId: insertedWorkspace.id,
              role: "owner",
            });
          }
        }
      }

      return this.createSession(dbUser.id, dbUser.email, dbUser.role, deviceMetadata);
    });
  }

  /**
   * Refreshes the access token and rotates the refresh token.
   */
  public async refreshSession(
    refreshToken: string,
    deviceMetadata: DeviceMetadata = {}
  ): Promise<AuthTokens> {
    if (!refreshToken) {
      throw new UnauthorizedException("Refresh token is missing.");
    }

    const tokenHash = this.hashToken(refreshToken);

    return this.txManager.runInTransaction<AuthTokens>(this.drizzleClient.db, async () => {
      // Find active session
      const [session] = await this.dbService.client
        .select()
        .from(sessions)
        .where(and(eq(sessions.refreshTokenHash, tokenHash), eq(sessions.isRevoked, false)))
        .limit(1);

      if (!session || Date.now() > session.expiresAt.getTime()) {
        throw new UnauthorizedException("Invalid, expired, or revoked session.");
      }

      // Fetch user details
      const [user] = await this.dbService.client
        .select()
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);

      if (!user) {
        throw new UnauthorizedException("User associated with this session no longer exists.");
      }

      // Revoke old session to support rotation
      const revokedSessions = await this.dbService.client
        .update(sessions)
        .set({ isRevoked: true })
        .where(and(eq(sessions.id, session.id), eq(sessions.isRevoked, false)))
        .returning({ id: sessions.id });

      if (revokedSessions.length !== 1) {
        throw new UnauthorizedException("Session has already been rotated or revoked.");
      }

      // Create new session and return rotated tokens
      return this.createSession(user.id, user.email, user.role, deviceMetadata);
    });
  }

  /**
   * Revokes the session associated with the provided refresh token.
   */
  public async revokeSession(refreshToken: string): Promise<void> {
    if (!refreshToken) {
      return;
    }
    const tokenHash = this.hashToken(refreshToken);

    await this.dbService.client
      .update(sessions)
      .set({ isRevoked: true })
      .where(eq(sessions.refreshTokenHash, tokenHash));
  }

  /**
   * Fetches the user profile and their associated workspaces.
   */
  public async getMe(userId: string) {
    const [user] = await this.dbService.client
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException("User not found.");
    }

    const workspacesList = await this.dbService.client
      .select({
        id: workspaces.id,
        name: workspaces.name,
        role: workspaceMembers.role,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(eq(workspaceMembers.userId, userId));

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      workspaces: workspacesList,
    };
  }

  // --- Helper Methods ---

  private async findUserByEmail(email: string) {
    const rows = await this.dbService.client
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return rows[0] || null;
  }

  private async createSession(
    userId: string,
    email: string,
    role: string,
    deviceMetadata: DeviceMetadata
  ): Promise<AuthTokens> {
    // 1. Generate access token
    const payload: TokenPayload = { sub: userId, email, role };
    const accessToken = await this.tokenService.signToken(payload);

    // 2. Generate refresh token
    const refreshToken = randomBytes(40).toString("hex");
    const refreshTokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // 3. Store session in database
    await this.dbService.client.insert(sessions).values({
      userId,
      refreshTokenHash,
      expiresAt,
      isRevoked: false,
      deviceMetadata,
    });

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
