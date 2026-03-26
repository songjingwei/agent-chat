import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq, and, isNull } from "drizzle-orm";

import type { DbClient } from "@agent/db";
import { adminUsers, adminRefreshTokens } from "@agent/db";

import { createId } from "../lib/id.js";
import { ApiError } from "../lib/api-error.js";

interface AdminAuthConfig {
  jwtSecret: string;
  jwtAccessExpiresIn: number;
  jwtRefreshExpiresIn: number;
}

interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  role: string;
  lastLoginAt: string | null;
  createdAt: string;
}

interface AdminAuthResponse {
  admin: AdminUser;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export class AdminAuthService {
  constructor(
    private readonly db: DbClient,
    private readonly config: AdminAuthConfig,
  ) {}

  async login(input: {
    username: string;
    password: string;
  }): Promise<AdminAuthResponse> {
    const rows = await this.db
      .select()
      .from(adminUsers)
      .where(
        and(
          eq(adminUsers.username, input.username),
          isNull(adminUsers.deletedAt),
        ),
      )
      .limit(1);

    const admin = rows[0];
    if (!admin) {
      throw new ApiError(
        401,
        "ADMIN_INVALID_CREDENTIALS",
        "Invalid username or password.",
      );
    }

    const valid = await bcrypt.compare(input.password, admin.passwordHash);
    if (!valid) {
      throw new ApiError(
        401,
        "ADMIN_INVALID_CREDENTIALS",
        "Invalid username or password.",
      );
    }

    // Update last login time
    await this.db
      .update(adminUsers)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(adminUsers.id, admin.id));

    const tokens = await this.generateTokenPair(admin.id, admin.role);

    return {
      admin: {
        id: admin.id,
        username: admin.username,
        displayName: admin.displayName,
        role: admin.role,
        lastLoginAt: new Date().toISOString(),
        createdAt: admin.createdAt.toISOString(),
      },
      tokens,
    };
  }

  async refresh(rawRefreshToken: string) {
    const tokenHash = this.hashToken(rawRefreshToken);

    const rows = await this.db
      .select()
      .from(adminRefreshTokens)
      .where(
        and(
          eq(adminRefreshTokens.tokenHash, tokenHash),
          isNull(adminRefreshTokens.revokedAt),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row || row.expiresAt < new Date()) {
      throw new ApiError(
        401,
        "ADMIN_TOKEN_EXPIRED",
        "Refresh token is invalid or expired.",
      );
    }

    // Revoke old token
    await this.db
      .update(adminRefreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(adminRefreshTokens.id, row.id));

    // Get admin user
    const adminRows = await this.db
      .select()
      .from(adminUsers)
      .where(
        and(eq(adminUsers.id, row.adminUserId), isNull(adminUsers.deletedAt)),
      )
      .limit(1);

    const admin = adminRows[0];
    if (!admin) {
      throw new ApiError(401, "ADMIN_TOKEN_INVALID", "Admin user not found.");
    }

    return this.generateTokenPair(admin.id, admin.role);
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawRefreshToken);

    await this.db
      .update(adminRefreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(adminRefreshTokens.tokenHash, tokenHash),
          isNull(adminRefreshTokens.revokedAt),
        ),
      );
  }

  async getProfile(adminId: string): Promise<AdminUser> {
    const rows = await this.db
      .select()
      .from(adminUsers)
      .where(
        and(eq(adminUsers.id, adminId), isNull(adminUsers.deletedAt)),
      )
      .limit(1);

    const admin = rows[0];
    if (!admin) {
      throw new ApiError(404, "ADMIN_NOT_FOUND", "Admin user not found.");
    }

    return {
      id: admin.id,
      username: admin.username,
      displayName: admin.displayName,
      role: admin.role,
      lastLoginAt: admin.lastLoginAt?.toISOString() ?? null,
      createdAt: admin.createdAt.toISOString(),
    };
  }

  private async generateTokenPair(adminId: string, role: string) {
    const accessToken = jwt.sign(
      { sub: adminId, role, type: "admin" },
      this.config.jwtSecret,
      { expiresIn: this.config.jwtAccessExpiresIn },
    );

    const rawRefreshToken = crypto.randomBytes(64).toString("hex");
    const tokenHash = this.hashToken(rawRefreshToken);

    await this.db.insert(adminRefreshTokens).values({
      id: createId("art"),
      adminUserId: adminId,
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
