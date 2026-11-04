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
import { z } from "zod";
import { config } from "../../config.js";
import { ApiError, input } from "../../infrastructure/http.js";
import { DocumentExtractor } from "../../providers/document-extractor.js";
import { LocalResumeModel } from "../../providers/local-resume-model.js";
import { AuthGuard } from "../auth/auth.guard.js";
import { resumeDebugPage } from "./resume-debug-page.js";

const modelInput = z.strictObject({
  rawText: z
    .string()
    .max(200000)
    .refine((value) => value.trim().length > 0, "请先获取 OCR 原文"),
  prompt: z.string().trim().min(1).max(20000),
  constrain: z.boolean(),
});

@ApiExcludeController()
@Controller("debug/resume")
export class ResumeDebugController {
  constructor(
    @Inject(DocumentExtractor) private readonly extractor: DocumentExtractor,
    @Inject(LocalResumeModel) private readonly model: LocalResumeModel,
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
    return { prompt: this.model.defaultPrompt };
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
    if (!file) throw new ApiError("E_FILE_MISSING", "请选择 PDF 或图片");
    const source = this.extractor.validate(file.originalname, file.buffer);
    if (source !== "image" && source !== "pdf")
      throw new ApiError("E_FILE_TYPE", "调试 OCR 只支持 PDF、PNG 和 JPEG");
    return this.extractor.extract(source, file.buffer);
  }

  @Header("Cache-Control", "no-store")
  @Post("run")
  @UseGuards(AuthGuard)
  run(@Body() body: unknown) {
    const value = input(modelInput, body);
    return this.model.debug(value.rawText, value.prompt, value.constrain);
  }
}
