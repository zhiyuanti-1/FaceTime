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
  @Get("topics") topics() {
    return this.questions.topics();
  }
  @Post("practices") create(
    @Req() request: AccountRequest,
    @Body() body: unknown,
  ) {
    return this.service.create(
      request.account.id,
      input(createPracticeInput, body),
    );
  }
  @Get("practices") list(@Req() request: AccountRequest) {
    return this.repo.list(request.account.id);
  }
  @Post("practices/preview") preview(@Body() body: unknown) {
    return this.service.preview(input(quotaInput, body));
  }
  @Put("practices/:id/progress") progress(
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
  @Post("practices/:id/turns/:turnId/skip") skip(
    @Req() req: AccountRequest,
    @Param("id") id: string,
    @Param("turnId") turnId: string,
  ) {
    return this.state.skip(req.account.id, id, turnId);
  }
  @Post("practices/:id/turns/:turnId/score") score(
    @Req() req: AccountRequest,
    @Param("id") id: string,
    @Param("turnId") turnId: string,
  ) {
    return this.scores.score(req.account.id, id, turnId);
  }
  @Post("practices/:id/report") report(
    @Req() req: AccountRequest,
    @Param("id") id: string,
  ) {
    return this.reports.create(req.account.id, id);
  }
  @Get("practices/:id/report") getReport(
    @Req() req: AccountRequest,
    @Param("id") id: string,
  ) {
    return this.reportRead.get(req.account.id, id);
  }
  @Get("practices/:id") get(
    @Req() request: AccountRequest,
    @Param("id") id: string,
  ) {
    return this.repo.get(request.account.id, id);
  }
  @Put("practices/:id/answers/:turnId") answer(
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
