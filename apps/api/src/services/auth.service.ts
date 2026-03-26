import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq, and, isNull } from "drizzle-orm";

import type { DbClient } from "@agent/db";
import { users, refreshTokens } from "@agent/db";
import {
  AUTH_INVALID_CREDENTIALS,
  AUTH_IDENTIFIER_AMBIGUOUS,
  AUTH_EMAIL_EXISTS,
  AUTH_TOKEN_INVALID,
  AUTH_TOKEN_EXPIRED,
  type AuthResponse,
  type AuthTokens,
  type AuthUser,
} from "@agent/shared";

import { createId } from "../lib/id.js";
import { ApiError } from "../lib/api-error.js";

interface AuthConfig {
  jwtSecret: string;
  jwtAccessExpiresIn: number;
  jwtRefreshExpiresIn: number;
}

export class AuthService {
  constructor(
    private readonly db: DbClient,
    private readonly config: AuthConfig,
  ) {}

  async register(input: {
    email: string;
    password: string;
    displayName: string;
  }): Promise<AuthResponse> {
    const existing = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (existing.length > 0) {
      throw new ApiError(409, AUTH_EMAIL_EXISTS, "Email already registered.");
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const userId = createId("usr");
    const now = new Date();

    await this.db.insert(users).values({
      id: userId,
      email: input.email,
      passwordHash,
      displayName: input.displayName,
      createdAt: now,
      updatedAt: now,
    });

    const tokens = await this.generateTokenPair(userId, input.email);

    return {
      user: {
        id: userId,
        email: input.email,
        displayName: input.displayName,
        createdAt: now.toISOString(),
      },
      tokens,
    };
  }

  async login(input: {
    identifier: string;
    password: string;
  }): Promise<AuthResponse> {
    const identifier = input.identifier.trim();
    const rows = await this.db
      .select()
      .from(users)
      .where(
        looksLikeEmail(identifier)
          ? eq(users.email, identifier)
          : eq(users.displayName, identifier),
      )
      .limit(2);

    if (!looksLikeEmail(identifier) && rows.length > 1) {
      throw new ApiError(
        409,
        AUTH_IDENTIFIER_AMBIGUOUS,
        "This display name matches multiple accounts. Please sign in with email.",
      );
    }

    const user = rows[0];
    if (!user) {
      throw new ApiError(
        401,
        AUTH_INVALID_CREDENTIALS,
        "Invalid email, display name, or password.",
      );
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new ApiError(
        401,
        AUTH_INVALID_CREDENTIALS,
        "Invalid email, display name, or password.",
      );
    }

    const tokens = await this.generateTokenPair(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt.toISOString(),
      },
      tokens,
    };
  }

  async refresh(rawRefreshToken: string): Promise<AuthTokens> {
    const tokenHash = this.hashToken(rawRefreshToken);

    const rows = await this.db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          isNull(refreshTokens.revokedAt),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row || row.expiresAt < new Date()) {
      throw new ApiError(
        401,
        AUTH_TOKEN_EXPIRED,
        "Refresh token is invalid or expired.",
      );
    }

    // Revoke old token
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, row.id));

    // Get user
    const userRows = await this.db
      .select()
      .from(users)
      .where(eq(users.id, row.userId))
      .limit(1);

    const user = userRows[0];
    if (!user) {
      throw new ApiError(401, AUTH_TOKEN_INVALID, "User not found.");
    }

    return this.generateTokenPair(user.id, user.email);
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawRefreshToken);

    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          isNull(refreshTokens.revokedAt),
        ),
      );
  }

  async getProfile(userId: string): Promise<AuthUser> {
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const user = rows[0];
    if (!user) {
      throw new ApiError(404, "USER_NOT_FOUND", "User not found.");
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private async generateTokenPair(
    userId: string,
    email: string,
  ): Promise<AuthTokens> {
    const accessToken = jwt.sign(
      { sub: userId, email },
      this.config.jwtSecret,
      { expiresIn: this.config.jwtAccessExpiresIn },
    );

    const rawRefreshToken = crypto.randomBytes(64).toString("hex");
    const tokenHash = this.hashToken(rawRefreshToken);

    await this.db.insert(refreshTokens).values({
      id: createId("rtk"),
      userId,
      tokenHash,
      expiresAt: new Date(
        Date.now() + this.config.jwtRefreshExpiresIn * 1000,
      ),
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: this.config.jwtAccessExpiresIn,
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }
}

function looksLikeEmail(value: string): boolean {
  return value.includes("@");
}
