import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiJsonBody } from "../../infrastructure/api-docs.js";
import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  answerInput,
  createPracticeInput,
  quotaInput,
  navigateInput,
} from "@face/shared";
import { AuthGuard } from "../auth/auth.guard.js";
import { input, type AccountRequest } from "../../infrastructure/http.js";
import { QuestionRepository } from "./question.repository.js";
import { PracticeRepository } from "./practice.repository.js";
import { ReportService } from "./report.service.js";
import { ReportRepository } from "./report.repository.js";
import { AnswerScoringService } from "./answer-scoring.service.js";
import { PracticeStateRepository } from "./practice-state.repository.js";
import { PracticeService } from "./practice.service.js";
@UseGuards(AuthGuard)
@ApiTags("练习与报告")
@Controller("api/v1")
export class PracticeController {
  constructor(
    @Inject(ReportService) private readonly reports: ReportService,
    @Inject(ReportRepository) private readonly reportRead: ReportRepository,
    @Inject(AnswerScoringService) private readonly scores: AnswerScoringService,
    @Inject(PracticeStateRepository)
    private readonly state: PracticeStateRepository,
    @Inject(QuestionRepository) private readonly questions: QuestionRepository,
    @Inject(PracticeRepository) private readonly repo: PracticeRepository,
    @Inject(PracticeService) private readonly service: PracticeService,
  ) {}
  @ApiOperation({ summary: "列出练习方向" })
  @Get("topics")
  topics() {
    return this.questions.topics();
  }
  @ApiOperation({ summary: "创建练习" })
  @Post("practices")
  @ApiJsonBody(createPracticeInput)
  create(@Req() request: AccountRequest, @Body() body: unknown) {
    return this.service.create(
      request.account.id,
      input(createPracticeInput, body),
    );
  }
  @ApiOperation({ summary: "列出练习记录" })
  @Get("practices")
  list(@Req() request: AccountRequest) {
    return this.repo.list(request.account.id);
  }
  @ApiOperation({ summary: "预览组卷配额" })
  @Post("practices/preview")
  @ApiJsonBody(quotaInput)
  preview(@Body() body: unknown) {
    return this.service.preview(input(quotaInput, body));
  }
  @ApiOperation({ summary: "更新练习进度" })
  @Put("practices/:id/progress")
  @ApiJsonBody(navigateInput)
  progress(
    @Req() req: AccountRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.state.navigate(
      req.account.id,
      id,
      input(navigateInput, body).index,
    );
  }
  @ApiOperation({ summary: "跳过当前题目" })
  @Post("practices/:id/turns/:turnId/skip")
  skip(
    @Req() req: AccountRequest,
    @Param("id") id: string,
    @Param("turnId") turnId: string,
  ) {
    return this.state.skip(req.account.id, id, turnId);
  }
  @ApiOperation({ summary: "评估单题回答" })
  @Post("practices/:id/turns/:turnId/score")
  score(
    @Req() req: AccountRequest,
    @Param("id") id: string,
    @Param("turnId") turnId: string,
  ) {
    return this.scores.score(req.account.id, id, turnId);
  }
  @ApiOperation({ summary: "生成练习报告" })
  @Post("practices/:id/report")
  report(@Req() req: AccountRequest, @Param("id") id: string) {
    return this.reports.create(req.account.id, id);
  }
  @ApiOperation({ summary: "读取练习报告" })
  @Get("practices/:id/report")
  getReport(@Req() req: AccountRequest, @Param("id") id: string) {
    return this.reportRead.get(req.account.id, id);
  }
  @ApiOperation({ summary: "查看练习详情" })
  @Get("practices/:id")
  get(@Req() request: AccountRequest, @Param("id") id: string) {
    return this.repo.get(request.account.id, id);
  }
  @ApiOperation({ summary: "保存文字回答" })
  @Put("practices/:id/answers/:turnId")
  @ApiJsonBody(answerInput)
  answer(
    @Req() request: AccountRequest,
    @Param("id") id: string,
    @Param("turnId") turnId: string,
    @Body() body: unknown,
  ) {
    return this.repo.answer(
      request.account.id,
      id,
      turnId,
      input(answerInput, body).text,
    );
  }
}
