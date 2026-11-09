import { Controller, Header, HttpCode, Inject, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { config } from "../../../config.js";
import { ApiError, input } from "../../../infrastructure/http.js";
import { AuthGuard } from "../../auth/auth.guard.js";
import { resumeUpload, type ResumeParseResponse } from "../dto/resume-parse.dto.js";
import { ResumeParseService } from "../service/resume-parse.service.js";

@Controller("resumes")
@UseGuards(AuthGuard)
export class ResumeParseController {
  constructor(@Inject(ResumeParseService) private readonly parser: ResumeParseService) {}

  @Post("parse")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  @UseInterceptors(FileInterceptor("file", {
    limits: { fileSize: config.UPLOAD_MAX_MB * 1024 * 1024, files: 1, fields: 0 },
  }))
  parse(@UploadedFile() file: unknown): Promise<ResumeParseResponse> {
    if (!file) throw new ApiError("E_FILE_MISSING", "请选择一个简历文件");
    return this.parser.parse(input(resumeUpload, file));
  }
}
