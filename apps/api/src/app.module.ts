import { Module } from "@nestjs/common";
import { AuthModule } from "./modules/auth/auth.module.js";
import { DashboardModule } from "./modules/dashboard/dashboard.module.js";
import { ProjectsModule } from "./modules/projects/projects.module.js";
import { ResumeModule } from "./modules/resume/resume.module.js";
import { DiagnosisModule } from "./modules/diagnosis/diagnosis.module.js";
import { NarrativeModule } from "./modules/narrative/narrative.module.js";
import { InterviewModule } from "./modules/interview/interview.module.js";
import { ReportModule } from "./modules/report/report.module.js";
import { ProfileModule } from "./modules/profile/profile.module.js";

// 应用启动不自动初始化数据库或调用模型。
@Module({ imports: [AuthModule, DashboardModule, ProjectsModule, ResumeModule, DiagnosisModule, NarrativeModule, InterviewModule, ReportModule, ProfileModule] })
export class AppModule {}
