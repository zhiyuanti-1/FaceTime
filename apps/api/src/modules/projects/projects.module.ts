import { Module } from "@nestjs/common";
import { OracleStore } from "../../infrastructure/database.js";
import { AuthModule } from "../auth/auth.module.js";
import { ProjectsController } from "./projects.controller.js";
import { ProjectsRepository } from "./projects.repository.js";
import { ProjectsService } from "./projects.service.js";

@Module({
  imports: [AuthModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectsRepository, OracleStore],
  exports: [ProjectsService],
})
export class ProjectsModule {}
