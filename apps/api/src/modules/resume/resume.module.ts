import { Module } from "@nestjs/common";
import { OracleStore } from "../../infrastructure/database.js";
import { BaiduOcr } from "../../providers/baidu-ocr.js";
import { DocumentExtractor } from "../../providers/document-extractor.js";
import { LocalResumeModel } from "../../providers/local-resume-model.js";
import { AuthModule } from "../auth/auth.module.js";
import { ResumeDebugController } from "./controller/resume-debug.controller.js";
import { ResumeParseController } from "./controller/resume-parse.controller.js";
import { ResumeController } from "./controller/resume.controller.js";
import { ResumeRepository } from "./repository/resume.repository.js";
import { ResumeService } from "./service/resume.service.js";
import { ResumeDebugService } from "./service/resume-debug.service.js";
import { ResumeParseService } from "./service/resume-parse.service.js";

@Module({
  imports: [AuthModule],
  controllers: [ResumeController, ResumeDebugController, ResumeParseController],
  providers: [
    ResumeService,
    ResumeDebugService,
    ResumeParseService,
    ResumeRepository,
    OracleStore,
    BaiduOcr,
    DocumentExtractor,
    LocalResumeModel,
  ],
})
export class ResumeModule {}
