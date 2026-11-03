import { Inject, Injectable } from "@nestjs/common";
import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { OracleStore } from "../../infrastructure/database.js";
import { ApiError } from "../../infrastructure/http.js";
import { config } from "../../config.js";
import { hashPassword, verifyPassword, tokenHash } from "./password.js";
const row = z.object({
  ID: z.string(),
  USERNAME: z.string(),
  PASSWORD_HASH: z.string(),
});
@Injectable()
export class AuthService {
  constructor(@Inject(OracleStore) private readonly db: OracleStore) {}
  async onModuleInit() {
    const users = await this.db.rows(
      "SELECT id,username,password_hash FROM face_app.face_users WHERE username=:1",
      [config.ADMIN_USERNAME],
      row,
    );
    const user = users[0];
    if (!user) {
      await this.db.execute(
        "INSERT INTO face_app.face_users(id,username,password_hash) VALUES(:1,:2,:3)",
        [
          randomUUID(),
          config.ADMIN_USERNAME,
          hashPassword(config.ADMIN_PASSWORD),
        ],
      );
    } else if (!verifyPassword(config.ADMIN_PASSWORD, user.PASSWORD_HASH)) {
      await this.db.transaction(async (runner) => {
        await this.db.execute(
          "UPDATE face_app.face_users SET password_hash=:1 WHERE id=:2",
          [hashPassword(config.ADMIN_PASSWORD), user.ID],
          runner,
        );
        await this.db.execute(
          "DELETE FROM face_app.face_auth_sessions WHERE user_id=:1",
          [user.ID],
          runner,
        );
      });
    }
  }
  async login(username: string, password: string) {
    const users = await this.db.rows(
      "SELECT id,username,password_hash FROM face_app.face_users WHERE username=:1",
      [username],
      row,
    );
    const user = users[0];
    if (!user || !verifyPassword(password, user.PASSWORD_HASH))
      throw new ApiError("E_LOGIN", "账号或密码不正确", 401);
    const token = randomBytes(32).toString("hex");
    await this.db.execute(
      "INSERT INTO face_app.face_auth_sessions(token_hash,user_id,expires_at) VALUES(:1,:2,SYSTIMESTAMP+NUMTODSINTERVAL(:3,'HOUR'))",
      [tokenHash(token), user.ID, config.AUTH_TTL_HOURS],
    );
    return { token, user: { id: user.ID, username: user.USERNAME } };
  }
  async findSession(token: string) {
    const users = await this.db.rows(
      "SELECT u.id,u.username FROM face_app.face_users u JOIN face_app.face_auth_sessions s ON s.user_id=u.id WHERE s.token_hash=:1 AND s.expires_at>SYSTIMESTAMP",
      [tokenHash(token)],
      row.omit({ PASSWORD_HASH: true }),
    );
    const user = users[0];
    return user ? { id: user.ID, username: user.USERNAME } : null;
  }
  async logout(token: string) {
    await this.db.execute(
      "DELETE FROM face_app.face_auth_sessions WHERE token_hash=:1",
      [tokenHash(token)],
    );
  }
}
