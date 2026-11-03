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
import { answerInput, createPracticeInput } from "@face/shared";
import { AuthGuard } from "../auth/auth.guard.js";
import { input, type AccountRequest } from "../../infrastructure/http.js";
import { QuestionRepository } from "./question.repository.js";
import { PracticeRepository } from "./practice.repository.js";
import { PracticeService } from "./practice.service.js";
@UseGuards(AuthGuard)
@Controller("api/v1")
export class PracticeController {
  constructor(
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
