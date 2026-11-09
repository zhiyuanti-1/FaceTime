import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Inject,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import { input, type AccountRequest } from "../../../infrastructure/http.js";
import { AuthGuard } from "../../auth/auth.guard.js";
import { resumeId, resumeSaveRequest, type ResumeDetail, type ResumeSummary } from "../dto/resume.dto.js";
import { ResumeService } from "../service/resume.service.js";

@Controller("resumes")
@UseGuards(AuthGuard)
export class ResumeController {
  constructor(@Inject(ResumeService) private readonly resumes: ResumeService) {}

  @Get()
  @Header("Cache-Control", "no-store")
  list(@Req() request: AccountRequest): Promise<readonly ResumeSummary[]> {
    return this.resumes.list(request.account.id);
  }

  @Get(":id")
  @Header("Cache-Control", "no-store")
  find(@Req() request: AccountRequest, @Param("id") id: unknown): Promise<ResumeDetail> {
    return this.resumes.find(request.account.id, input(resumeId, id));
  }

  @Post()
  @Header("Cache-Control", "no-store")
  create(@Req() request: AccountRequest, @Body() body: unknown): Promise<ResumeDetail> {
    return this.resumes.create(request.account.id, input(resumeSaveRequest, body));
  }

  @Put(":id")
  @Header("Cache-Control", "no-store")
  replace(
    @Req() request: AccountRequest,
    @Param("id") id: unknown,
    @Body() body: unknown,
  ): Promise<ResumeDetail> {
    return this.resumes.replace(
      request.account.id,
      input(resumeId, id),
      input(resumeSaveRequest, body),
    );
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@Req() request: AccountRequest, @Param("id") id: unknown) {
    return this.resumes.remove(request.account.id, input(resumeId, id));
  }
}
