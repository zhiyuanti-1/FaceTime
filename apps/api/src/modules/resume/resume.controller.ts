import {
  Body,
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
import { confirmResumeInput } from "@face/shared";
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
