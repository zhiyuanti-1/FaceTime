import { ResumeDebugController } from "./modules/resume/resume-debug.controller.js";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { LocalResumeModel } from "./providers/local-resume-model.js";
import { PracticeStateRepository } from "./modules/practice/practice-state.repository.js";
import { AnswerScoringService } from "./modules/practice/answer-scoring.service.js";
import { ReportRepository } from "./modules/practice/report.repository.js";
import { ReportService } from "./modules/practice/report.service.js";
import { ResumeAiService } from "./modules/resume/resume-ai.service.js";
import { PreferencesRepository } from "./modules/workspace/preferences.repository.js";
import { WorkspaceService } from "./modules/workspace/workspace.service.js";
import { DataService } from "./modules/workspace/data.service.js";
import { WorkspaceController } from "./modules/workspace/workspace.controller.js";
import { DeepSeek } from "./providers/deepseek.js";
import { Controller, Get, Inject, Module, UseGuards } from "@nestjs/common";
import { config } from "./config.js";
import { OracleStore } from "./infrastructure/database.js";
import { AuthService } from "./modules/auth/auth.service.js";
import { AuthController } from "./modules/auth/auth.controller.js";
import { AuthGuard } from "./modules/auth/auth.guard.js";
import { ResumeRepository } from "./modules/resume/resume.repository.js";
import { ResumeService } from "./modules/resume/resume.service.js";
import { ResumeController } from "./modules/resume/resume.controller.js";
import { BaiduOcr } from "./providers/baidu-ocr.js";
import { DocumentExtractor } from "./providers/document-extractor.js";
import { QuestionRepository } from "./modules/practice/question.repository.js";
import { PracticeRepository } from "./modules/practice/practice.repository.js";
import { PracticeService } from "./modules/practice/practice.service.js";
import { PracticeController } from "./modules/practice/practice.controller.js";
@ApiTags("系统状态")
@Controller("api")
class SystemController {
  constructor(@Inject(OracleStore) private readonly db: OracleStore) {}
  @ApiOperation({ summary: "检查服务与数据库" })
  @Get("health")
  async health() {
    await this.db.execute("SELECT 1 FROM dual");
    return { ok: true, version: "0.3.0" };
  }
  @ApiOperation({ summary: "查看本机设置" })
  @UseGuards(AuthGuard)
  @Get("v1/settings")
  settings() {
    return {
      baiduConfigured: !!(config.BAIDU_AK && config.BAIDU_SK),
      ocrEndpoint: config.BAIDU_OCR_ENDPOINT,
      uploadMaxMb: config.UPLOAD_MAX_MB,
      pdfMaxPages: config.PDF_MAX_PAGES,
      database: "Oracle",
      scoringEnabled: true,
    };
  }
}
@Module({
  controllers: [
    SystemController,
    WorkspaceController,
    AuthController,
    ResumeController,
    ResumeDebugController,
    PracticeController,
  ],
  providers: [
    OracleStore,
    PracticeStateRepository,
    AnswerScoringService,
    ReportRepository,
    ReportService,
    ResumeAiService,
    PreferencesRepository,
    WorkspaceService,
    DataService,
    DeepSeek,
    AuthService,
    AuthGuard,
    ResumeRepository,
    ResumeService,
    LocalResumeModel,
    BaiduOcr,
    DocumentExtractor,
    QuestionRepository,
    PracticeRepository,
    PracticeService,
  ],
})
export class AppModule {}
