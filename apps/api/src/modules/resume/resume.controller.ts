import { ApiJsonBody } from "../../infrastructure/api-docs.js";
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { resumeFields, resumeSchema } from "@face/shared";
import { z } from "zod";
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
const draftResponse = z.toJSONSchema(
  resumeSchema.extend({
    draft: z
      .discriminatedUnion("ok", [
        z.object({ ok: z.literal(true), structured: resumeFields }),
        z.object({
          ok: z.literal(false),
          error: z.object({ code: z.string(), message: z.string() }),
        }),
      ])
      .nullable(),
  }),
  { target: "openapi-3.0" },
);
@UseGuards(AuthGuard)
@ApiTags("简历管理")
@Controller("api/v1/resumes")
export class ResumeController {
  constructor(
    @Inject(ResumeAiService) private readonly ai: ResumeAiService,
    @Inject(DataService) private readonly data: DataService,
    @Inject(ResumeRepository) private readonly repo: ResumeRepository,
    @Inject(ResumeService) private readonly service: ResumeService,
  ) {}
  @ApiOperation({
    summary: "列出简历",
    description:
      "包含isDefault与deletionPending。删除中记录仍占名额，可对同一ID重试DELETE。",
  })
  @Get()
  list(@Req() request: AccountRequest) {
    return this.repo.list(request.account.id);
  }
  @ApiOperation({ summary: "上传简历并生成可编辑草稿" })
  @Post()
  @ApiCreatedResponse({
    description: "返回简历记录和待核对草稿。点击保存后才写入结构化字段。",
    schema: draftResponse as Extract<
      NonNullable<Parameters<typeof ApiCreatedResponse>[0]>,
      { schema: unknown }
    >["schema"],
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["file"],
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: config.UPLOAD_MAX_MB * 1024 * 1024, files: 1 },
    }),
  )
  async upload(
    @Req() request: AccountRequest,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) throw new ApiError("E_FILE_MISSING", "请选择简历文件");
    const resume = await this.service.upload(request.account.id, file);
    return this.service.withDraft(request.account.id, resume);
  }
  @ApiOperation({ summary: "粘贴简历文本" })
  @Post("paste")
  @ApiJsonBody(pasteResumeInput)
  paste(@Req() req: AccountRequest, @Body() body: unknown) {
    const value = input(pasteResumeInput, body);
    return this.service.paste(req.account.id, value.text, value.filename);
  }
  @ApiOperation({ summary: "分析简历并生成面试素材" })
  @Post(":id/analyze")
  analyze(@Req() req: AccountRequest, @Param("id") id: string) {
    return this.ai.analyze(req.account.id, id);
  }
  @ApiOperation({
    summary: "设置默认简历",
    description: "幂等设置本人未删除简历，返回defaultId；删除中记录返回404。",
  })
  @Put(":id/default")
  setDefault(@Req() req: AccountRequest, @Param("id") id: string) {
    return this.service.setDefault(req.account.id, id);
  }
  @ApiOperation({
    summary: "删除整份简历，删除中可重复请求重试",
    description:
      "须提交confirmation=DELETE。先持久化标记，再清文件，最后事务清记录与默认引用；成功返回ok及defaultId，文件失败返回E_DELETE_FILES，不释放名额。",
  })
  @Delete(":id")
  @ApiJsonBody(deleteConfirmation)
  remove(
    @Req() req: AccountRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    input(deleteConfirmation, body);
    return this.data.removeResume(req.account.id, id);
  }
  @ApiOperation({ summary: "查看简历详情" })
  @Get(":id")
  async get(@Req() request: AccountRequest, @Param("id") id: string) {
    return this.repo.dto(await this.repo.get(request.account.id, id));
  }
  @ApiOperation({ summary: "保存核对后的简历文本" })
  @Put(":id/text")
  @ApiJsonBody(confirmResumeInput)
  confirm(
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
  @ApiOperation({ summary: "重新识别简历" })
  @Post(":id/recognize")
  async recognize(@Req() request: AccountRequest, @Param("id") id: string) {
    const resume = await this.service.recognize(request.account.id, id);
    return this.service.withDraft(request.account.id, resume);
  }
  @ApiOperation({ summary: "读取结构化简历" })
  @Get(":id/structured")
  async structure(@Req() req: AccountRequest, @Param("id") id: string) {
    return {
      structured: this.repo.structure(await this.repo.get(req.account.id, id)),
    };
  }
  @ApiOperation({ summary: "从已识别原文重新生成草稿" })
  @Post(":id/structured/draft")
  draftStructure(@Req() req: AccountRequest, @Param("id") id: string) {
    return this.service.draftStructure(req.account.id, id);
  }
  @ApiOperation({ summary: "修改结构化简历" })
  @Put(":id/structured")
  @ApiJsonBody(resumeFields)
  saveStructure(
    @Req() req: AccountRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.repo.saveStructure(
      req.account.id,
      id,
      input(resumeFields, body),
    );
  }
  @ApiOperation({ summary: "清除结构化简历" })
  @Delete(":id/structured")
  clearStructure(@Req() req: AccountRequest, @Param("id") id: string) {
    return this.repo.saveStructure(req.account.id, id, null);
  }
  @ApiOperation({ summary: "下载简历原文件" })
  @Get(":id/file")
  async file(
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
