import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from "@nestjs/common";
import { z } from "zod";
import { AuthService } from "./auth.service.js";
import { ApiError, type AccountRequest } from "../../infrastructure/http.js";
export function sessionCookie(cookies: unknown) {
  return z
    .object({ face_session: z.string().regex(/^[a-f0-9]{64}$/) })
    .safeParse(cookies);
}
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AccountRequest>();
    const parsed = sessionCookie(request.cookies as unknown);
    if (!parsed.success) throw new ApiError("E_UNAUTHORIZED", "请先登录", 401);
    const account = await this.auth.findSession(parsed.data.face_session);
    if (!account)
      throw new ApiError("E_UNAUTHORIZED", "登录已过期，请重新登录", 401);
    request.account = account;
    return true;
  }
}
