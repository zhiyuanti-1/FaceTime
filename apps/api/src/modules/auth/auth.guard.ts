import {
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { z } from "zod";
import { ApiError, type AccountRequest } from "../../infrastructure/http.js";
import { AuthService } from "./auth.service.js";

export const sessionCookieName = "face_session";
const cookiesSchema = z.object({
  [sessionCookieName]: z.string().regex(/^[a-f0-9]{64}$/),
});

export function readSessionCookie(cookies: unknown) {
  const result = cookiesSchema.safeParse(cookies);
  return result.success ? result.data[sessionCookieName] : undefined;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AccountRequest>();
    const account = this.auth.findSession(readSessionCookie(request.cookies));
    if (!account)
      throw new ApiError("E_UNAUTHORIZED", "请登录本机管理员账号", 401);
    request.account = account;
    return true;
  }
}
