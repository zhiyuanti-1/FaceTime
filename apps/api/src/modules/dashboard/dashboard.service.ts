import { dashboardResponse } from "@face/shared";
import { Inject, Injectable } from "@nestjs/common";
import type { AccountRequest } from "../../infrastructure/http.js";
import { ProjectsService } from "../projects/projects.service.js";

@Injectable()
export class DashboardService {
  constructor(@Inject(ProjectsService) private readonly projects: ProjectsService) {}

  async overview(account: AccountRequest["account"]) {
    const summary = await this.projects.summarize(account.id);
    return dashboardResponse.parse({ username: account.username, ...summary });
  }
}
