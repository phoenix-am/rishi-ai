import {
  Injectable,
  Inject,
  UnauthorizedException,
  BadRequestException,
  forwardRef,
} from "@nestjs/common";
import { DatabaseService, users, workspaces, workspaceMembers, sessions } from "@rishi/database";
import { ConfigService } from "@rishi/config";
import { TransactionManager } from "@rishi/transaction";
import { InMemoryOtpStore } from "./otp.store.js";

import { eq, and } from "drizzle-orm";
import { randomBytes, createHash } from "crypto";
import jwt from "jsonwebtoken";

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class AuthApplicationService {
  constructor(
    @Inject(DatabaseService) private readonly dbService: DatabaseService,
    @Inject(TransactionManager) private readonly txManager: TransactionManager,
    @Inject("DRIZZLE_CLIENT") private readonly drizzleClient: any,
    @Inject(forwardRef(() => InMemoryOtpStore)) private readonly otpStore: InMemoryOtpStore,
    @Inject("IEmailProvider") private readonly emailProvider: any,
    @Inject(ConfigService) private readonly configService: ConfigService
  ) {}

  /**
   * Generates a passwordless OTP and sends it via the email provider.
   */
  public async requestOtp(email: string): Promise<void> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      throw new BadRequestException("Email address is required.");
    }
    const code = this.otpStore.generateAndStore(normalized);
    await this.emailProvider.sendOtp(normalized, code);
  }

  /**
   * Verifies the OTP, registers/retrieves the user, initializes their default workspace,
   * creates a new session, and returns the tokens.
   */
  public async verifyOtp(
    email: string,
    code: string,
    deviceMetadata: Record<string, any> = {}
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const normalized = email.trim().toLowerCase();
    const isValid = this.otpStore.verifyAndConsume(normalized, code);

    if (!isValid) {
      throw new UnauthorizedException("Invalid or expired OTP verification code.");
    }

    // Run User & Workspace initialization atomically
    const user = await this.txManager.runInTransaction(this.drizzleClient.db, async () => {
      let dbUser = await this.findUserByEmail(normalized);

      if (!dbUser) {
        // Register new user
        const [insertedUser] = await this.dbService.client
          .insert(users)
          .values({
            email: normalized,
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
            name: `${normalized}'s Workspace`,
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
              name: `${normalized}'s Workspace`,
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

      return dbUser;
    });

    // Create session and issue tokens
    return this.createSession(user.id, user.email, user.role, deviceMetadata);
  }

  /**
   * Refreshes the access token and rotates the refresh token.
   */
  public async refreshSession(
    refreshToken: string,
    deviceMetadata: Record<string, any> = {}
  ): Promise<{ accessToken: string; refreshToken: string }> {
    if (!refreshToken) {
      throw new UnauthorizedException("Refresh token is missing.");
    }

    const tokenHash = this.hashToken(refreshToken);

    return this.txManager.runInTransaction(this.drizzleClient.db, async () => {
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
      await this.dbService.client
        .update(sessions)
        .set({ isRevoked: true })
        .where(eq(sessions.id, session.id));

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

  /**
   * Decodes PEM (handling Base64 format if set in environment).
   */
  public decodePemKey(key: string): string {
    if (!key) {
      return "";
    }
    if (key.includes("-----BEGIN")) {
      return key;
    }
    try {
      const decoded = Buffer.from(key, "base64").toString("utf-8");
      if (decoded.includes("-----BEGIN")) {
        return decoded;
      }
    } catch {
      // Fallback if not base64 encoded
    }
    return key;
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
    deviceMetadata: Record<string, any>
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const privateKey = this.decodePemKey(this.configService.get("JWT_PRIVATE_KEY"));
    if (!privateKey) {
      throw new Error("JWT Private Key configuration is missing or invalid.");
    }

    // 1. Generate access token
    const payload: TokenPayload = { sub: userId, email, role };
    const accessToken = jwt.sign(payload, privateKey, {
      algorithm: "RS256",
      expiresIn: "15m",
    });

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
