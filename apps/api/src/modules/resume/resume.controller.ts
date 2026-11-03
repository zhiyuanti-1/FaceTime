import {
  Body,
  Delete,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { ResumeAiService } from "./resume-ai.service.js";
import { DataService } from "../workspace/data.service.js";
import {
  confirmResumeInput,
  pasteResumeInput,
  deleteConfirmation,
} from "@face/shared";
import { AuthGuard } from "../auth/auth.guard.js";
import {
  ApiError,
  input,
  type AccountRequest,
} from "../../infrastructure/http.js";
import { config } from "../../config.js";
import { ResumeRepository } from "./resume.repository.js";
import { ResumeService } from "./resume.service.js";
@UseGuards(AuthGuard)
@Controller("api/v1/resumes")
export class ResumeController {
  constructor(
    @Inject(ResumeAiService) private readonly ai: ResumeAiService,
    @Inject(DataService) private readonly data: DataService,
    @Inject(ResumeRepository) private readonly repo: ResumeRepository,
    @Inject(ResumeService) private readonly service: ResumeService,
  ) {}
  @Get() list(@Req() request: AccountRequest) {
    return this.repo.list(request.account.id);
  }
  @Post()
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: config.UPLOAD_MAX_MB * 1024 * 1024, files: 1 },
    }),
  )
  upload(
    @Req() request: AccountRequest,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) throw new ApiError("E_FILE_MISSING", "请选择简历文件");
    return this.service.upload(request.account.id, file);
  }
  @Post("paste") paste(@Req() req: AccountRequest, @Body() body: unknown) {
    const value = input(pasteResumeInput, body);
    return this.service.paste(req.account.id, value.text, value.filename);
  }
  @Post(":id/analyze") analyze(
    @Req() req: AccountRequest,
    @Param("id") id: string,
  ) {
    return this.ai.analyze(req.account.id, id);
  }
  @Delete(":id") remove(
    @Req() req: AccountRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    input(deleteConfirmation, body);
    return this.data.removeResume(req.account.id, id);
  }
  @Get(":id") async get(
    @Req() request: AccountRequest,
    @Param("id") id: string,
  ) {
    return this.repo.dto(await this.repo.get(request.account.id, id));
  }
  @Put(":id/text") confirm(
    @Req() request: AccountRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.repo.confirm(
      request.account.id,
      id,
      input(confirmResumeInput, body).text,
    );
  }
  @Post(":id/recognize") recognize(
    @Req() request: AccountRequest,
    @Param("id") id: string,
  ) {
    return this.service.recognize(request.account.id, id);
  }
  @Get(":id/file") async file(
    @Req() request: AccountRequest,
    @Param("id") id: string,
    @Res() response: Response,
  ) {
    const value = await this.repo.get(request.account.id, id);
    response.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(value.ORIGINAL_FILENAME)}`,
    );
    return response.sendFile(this.service.path(value.ORIGINAL_PATH));
  }
}
