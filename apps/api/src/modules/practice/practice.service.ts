import { Inject, Injectable } from "@nestjs/common";
import type { CreatePractice } from "@face/shared";
import { QuestionRepository } from "./question.repository.js";
import { PracticeRepository } from "./practice.repository.js";
import { ResumeRepository } from "../resume/resume.repository.js";
import { ApiError } from "../../infrastructure/http.js";
import { allocateQuestions } from "./allocation.js";
@Injectable()
export class PracticeService {
  constructor(
    @Inject(QuestionRepository) private readonly questions: QuestionRepository,
    @Inject(PracticeRepository) private readonly practices: PracticeRepository,
    @Inject(ResumeRepository) private readonly resumes: ResumeRepository,
  ) {}
  async create(owner: string, body: CreatePractice) {
    if (body.resumeId) await this.resumes.get(owner, body.resumeId);
    const topics = await this.questions.topics();
    if (
      Object.entries(body.weights).some(
        ([id, value]) => value > 0 && !topics.some((t) => t.id === id),
      )
    )
      throw new ApiError("E_TOPIC", "所选方向不存在");
    let quotas: { id: string; count: number }[];
    try {
      quotas = allocateQuestions(
        body.count,
        topics.map((t) => ({
          id: t.id,
          weight: body.weights[t.id] ?? 0,
          available: t.count,
        })),
      );
    } catch (error) {
      throw new ApiError(
        "E_WEIGHTS",
        error instanceof Error ? error.message : "权重配置无效",
      );
    }
    const selected = [];
    for (const quota of quotas) {
      const pool = await this.questions.questions(quota.id);
      selected.push(...pool.slice(0, quota.count));
    }
    if (selected.length !== body.count)
      throw new ApiError("E_BANK_CHANGED", "题库已更新，请重新开始练习");
    return this.practices.create(owner, body, selected);
  }
}
