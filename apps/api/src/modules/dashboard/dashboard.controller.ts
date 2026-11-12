import { Controller, Get, Header, Inject, Req, UseGuards } from "@nestjs/common";
import type { AccountRequest } from "../../infrastructure/http.js";
import { AuthGuard } from "../auth/auth.guard.js";
import { DashboardService } from "./dashboard.service.js";

@Controller("dashboard")
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(@Inject(DashboardService) private readonly dashboard: DashboardService) {}

  @Get()
  @Header("Cache-Control", "no-store")
  overview(@Req() request: AccountRequest) {
    return this.dashboard.overview(request.account);
  }
}
