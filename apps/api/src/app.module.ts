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
@Controller("api")
class SystemController {
  constructor(@Inject(OracleStore) private readonly db: OracleStore) {}
  @Get("health") async health() {
    await this.db.execute("SELECT 1 FROM dual");
    return { ok: true, version: "0.2.0" };
  }
  @UseGuards(AuthGuard) @Get("v1/settings") settings() {
    return {
      baiduConfigured: !!(config.BAIDU_AK && config.BAIDU_SK),
      ocrEndpoint: config.BAIDU_OCR_ENDPOINT,
      uploadMaxMb: config.UPLOAD_MAX_MB,
      pdfMaxPages: config.PDF_MAX_PAGES,
      database: "Oracle",
      scoringEnabled: false,
    };
  }
}
@Module({
  controllers: [
    SystemController,
    AuthController,
    ResumeController,
    PracticeController,
  ],
  providers: [
    OracleStore,
    AuthService,
    AuthGuard,
    ResumeRepository,
    ResumeService,
    BaiduOcr,
    DocumentExtractor,
    QuestionRepository,
    PracticeRepository,
    PracticeService,
  ],
})
export class AppModule {}
