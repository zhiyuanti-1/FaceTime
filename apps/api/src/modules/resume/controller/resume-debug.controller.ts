import {
  Body,
  Controller,
  Get,
  Header,
  Inject,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiExcludeController } from "@nestjs/swagger";
import { config } from "../../../config.js";
import { input } from "../../../infrastructure/http.js";
import { AuthGuard } from "../../auth/auth.guard.js";
import { resumeDebugRequest } from "../dto/resume-debug.dto.js";
import { ResumeDebugService } from "../service/resume-debug.service.js";
import { resumeDebugPage } from "./resume-debug-page.js";

@ApiExcludeController()
@Controller("debug/resume")
export class ResumeDebugController {
  constructor(
    @Inject(ResumeDebugService) private readonly debug: ResumeDebugService,
  ) {}

  @Header("Cache-Control", "no-store")
  @Get()
  @Header("Content-Type", "text/html; charset=utf-8")
  page() {
    return resumeDebugPage;
  }

  @Header("Cache-Control", "no-store")
  @Get("prompt")
  @UseGuards(AuthGuard)
  prompt() {
    return this.debug.getPrompt();
  }

  @Header("Cache-Control", "no-store")
  @Post("ocr")
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: config.UPLOAD_MAX_MB * 1024 * 1024, files: 1 },
    }),
  )
  ocr(@UploadedFile() file?: Express.Multer.File) {
    return this.debug.extractDocument(file);
  }

  @Header("Cache-Control", "no-store")
  @Post("run")
  @UseGuards(AuthGuard)
  run(@Body() body: unknown) {
    return this.debug.run(input(resumeDebugRequest, body));
  }
}
