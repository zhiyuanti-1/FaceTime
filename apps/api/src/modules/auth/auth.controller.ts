import {
  Body,
  Controller,
  Header,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { input } from "../../infrastructure/http.js";
import { readSessionCookie, sessionCookieName } from "./auth.guard.js";
import { AuthService, sessionLifetimeMs } from "./auth.service.js";
import { adminResponse, loginRequest, type AdminResponse } from "./dto/login.dto.js";

const cookieOptions = {
  httpOnly: true,
  sameSite: "strict",
  path: "/",
} as const;

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post("login")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  login(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): AdminResponse {
    const { username, password } = input(loginRequest, body);
    const { token, account } = this.auth.login(username, password, readSessionCookie(request.cookies));
    response.cookie(sessionCookieName, token, {
      ...cookieOptions,
      maxAge: sessionLifetimeMs,
    });
    return adminResponse.parse(account);
  }

  @Post("logout")
  @HttpCode(204)
  logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.auth.logout(readSessionCookie(request.cookies));
    response.clearCookie(sessionCookieName, cookieOptions);
  }
}
