import { Inject, Injectable } from "@nestjs/common";
import type { CreatePractice, publicQuestionSchema } from "@face/shared";
import { QuestionRepository } from "./question.repository.js";
import { PracticeRepository } from "./practice.repository.js";
import { ResumeRepository } from "../resume/resume.repository.js";
import { ApiError } from "../../infrastructure/http.js";
import { ResumeAiService } from "../resume/resume-ai.service.js";
import { z } from "zod";
import { allocateQuestions } from "./allocation.js";
@Injectable()
export class PracticeService {
  constructor(
    @Inject(ResumeAiService) private readonly resumeAi: ResumeAiService,
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
    const quotas = this.quotas(
      body.mode === "interview" ? 5 : body.count,
      body.weights,
      topics,
      body.mode ?? "knowledge",
    );
    const selected = [];
    for (const quota of quotas) {
      const pool = await this.questions.questions(quota.id);
      selected.push(...pool.slice(0, quota.count));
    }
    if (selected.length !== (body.mode === "interview" ? 5 : body.count))
      throw new ApiError("E_BANK_CHANGED", "题库已更新，请重新开始练习");
    if (body.mode !== "interview")
      return this.practices.create(owner, body, selected);
    if (!body.resumeId)
      throw new ApiError(
        "E_RESUME_REQUIRED",
        "常规面试请先选择已确认简历",
        400,
      );
    if (!body.jobTitle?.trim())
      throw new ApiError("E_JOB_REQUIRED", "请填写本次岗位", 400);
    const resume = await this.resumes.get(owner, body.resumeId);
    if (!resume.EDITED_TEXT)
      throw new ApiError("E_RESUME_UNCONFIRMED", "请先保存确认文本", 409);
    const plan = await this.resumeAi.probes(resume.EDITED_TEXT, body.jobTitle);
    const probes: z.infer<typeof publicQuestionSchema>[] = plan.probes.map(
      (probe, i) => ({
        id: `probe_${i}`,
        text: probe.question,
        topicId: "resume",
        topicName: probe.source === "gap_fill" ? "通用深挖" : "简历深挖",
        difficulty: probe.severity,
        stage: "generated",
        kind: probe.source === "gap_fill" ? "general" : "resume",
        anchorQuote: probe.anchorQuote,
        source: probe.source,
        confidence: probe.confidence,
      }),
    );
    const ordered =
      body.order === "knowledge_first"
        ? [...selected, ...probes]
        : selected.flatMap((q, i) =>
            [q, probes[i]].filter(
              (item): item is z.infer<typeof publicQuestionSchema> => !!item,
            ),
          );
    return this.practices.create(owner, { ...body, count: 10 }, ordered, {
      text: resume.EDITED_TEXT,
      analysis: plan.analysis,
    });
  }
  quotas(
    count: number,
    weights: Record<string, number>,
    topics: { id: string; count: number }[],
    mode: string,
  ) {
    if (
      Object.entries(weights).some(
        ([id, weight]) => weight > 0 && !topics.some((t) => t.id === id),
      )
    )
      throw new ApiError("E_TOPIC", "方向不存在");
    const available = topics.map((t) => ({
      id: t.id,
      weight: weights[t.id] ?? 0,
      available: mode === "interview" ? Math.min(2, t.count) : t.count,
    }));
    if (
      mode === "interview" &&
      available.filter((t) => t.weight > 0 && t.available > 0).length < 3
    )
      throw new ApiError("E_WEIGHTS", "常规面试至少选择3个方向，每方向最多2题");
    try {
      return allocateQuestions(count, available);
    } catch (error) {
      throw new ApiError(
        "E_WEIGHTS",
        error instanceof Error ? error.message : "配额无效",
      );
    }
  }
  async preview(body: {
    weights: Record<string, number>;
    count: number;
    mode: string;
  }) {
    return {
      mode: body.mode,
      count: body.mode === "interview" ? 10 : body.count,
      knowledgeCount: body.mode === "interview" ? 5 : body.count,
      probeCount: body.mode === "interview" ? 5 : 0,
      quotas: this.quotas(
        body.mode === "interview" ? 5 : body.count,
        body.weights,
        await this.questions.topics(),
        body.mode,
      ),
    };
  }
}
