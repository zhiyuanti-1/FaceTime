import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { loginInput } from "@face/shared";
import { input, type AccountRequest } from "../../infrastructure/http.js";
import { config } from "../../config.js";
import { AuthService } from "./auth.service.js";
import { AuthGuard, sessionCookie } from "./auth.guard.js";
@Controller("api/v1/auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  @Post("login") async login(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const parsed = input(loginInput, body);
    const result = await this.auth.login(parsed.username, parsed.password);
    response.cookie("face_session", result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: config.AUTH_TTL_HOURS * 3600000,
      path: "/",
    });
    return result.user;
  }
  @UseGuards(AuthGuard) @Get("me") me(@Req() request: AccountRequest) {
    return request.account;
  }
  @Post("logout") async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const parsed = sessionCookie(request.cookies as unknown);
    if (parsed.success) await this.auth.logout(parsed.data.face_session);
    response.clearCookie("face_session", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
    return { ok: true };
  }
}
