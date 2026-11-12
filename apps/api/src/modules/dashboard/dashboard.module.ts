import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { ProjectsModule } from "../projects/projects.module.js";
import { DashboardController } from "./dashboard.controller.js";
import { DashboardService } from "./dashboard.service.js";

@Module({ imports: [AuthModule, ProjectsModule], controllers: [DashboardController], providers: [DashboardService] })
export class DashboardModule {}
