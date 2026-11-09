import { Injectable } from "@nestjs/common";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { config } from "../../config.js";
import { ApiError } from "../../infrastructure/http.js";

export const sessionLifetimeMs = 12 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly sessions = new Map<string, number>();

  login(username: string, password: string, previousToken?: string) {
    const { ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_OWNER_ID } = config;
    if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !ADMIN_OWNER_ID) {
      throw new ApiError(
        "E_ADMIN_CONFIG",
        "请先配置本机管理员账号、密码和固定编号",
        503,
      );
    }
    const expected = createHash("sha256").update(ADMIN_PASSWORD).digest();
    const supplied = createHash("sha256").update(password).digest();
    if (!timingSafeEqual(expected, supplied) || username !== ADMIN_USERNAME) {
      throw new ApiError("E_LOGIN", "账号或密码不正确", 401);
    }
    this.logout(previousToken);
    const now = Date.now();
    for (const [token, expiresAt] of this.sessions) {
      if (expiresAt <= now) this.sessions.delete(token);
    }
    const token = randomBytes(32).toString("hex");
    this.sessions.set(token, now + sessionLifetimeMs);
    return { token, account: { id: ADMIN_OWNER_ID, username: ADMIN_USERNAME } };
  }

  findSession(token: string | undefined) {
    if (!token) return null;
    const expiresAt = this.sessions.get(token);
    if (!expiresAt || expiresAt <= Date.now()) {
      this.sessions.delete(token);
      return null;
    }
    const { ADMIN_USERNAME, ADMIN_OWNER_ID } = config;
    return ADMIN_USERNAME && ADMIN_OWNER_ID
      ? { id: ADMIN_OWNER_ID, username: ADMIN_USERNAME }
      : null;
  }

  logout(token: string | undefined) {
    if (token) this.sessions.delete(token);
  }
}
