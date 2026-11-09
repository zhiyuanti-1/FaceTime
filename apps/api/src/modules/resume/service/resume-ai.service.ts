import { Inject, Injectable } from "@nestjs/common";
import { resumeAnalysisSchema, probePlanSchema, type ResumeAnalysis } from "@face/shared";
import { DeepSeek } from "../../../providers/deepseek.js";
import { ApiError } from "../../../infrastructure/http.js";

// 保留现有分析、出题和引用校验；不再读取或写入旧业务数据库。
@Injectable()
export class ResumeAiService {
  constructor(@Inject(DeepSeek) private readonly ai: DeepSeek) {}

  async analyze(resumeText: string) {
    const result = await this.ai.run("parse-resume", { resumeText }, resumeAnalysisSchema);
    this.validate(result, resumeText);
    return result;
  }
  validate(result: ResumeAnalysis, text: string) {
    if (
      [result.name, result.targetRole].some(
        (value) => value !== null && !text.includes(value),
      )
    )
      throw new ApiError(
        "E_LLM_EVIDENCE",
        "AI基本信息不在简历中，结果未生效",
        502,
      );
    if (
      [...result.projects, ...result.suspicions].some(
        (item) => !text.includes(item.quote),
      )
    )
      throw new ApiError("E_LLM_EVIDENCE", "AI引用不在简历中，结果未生效", 502);
  }
  async probes(resumeText: string, jobTitle: string) {
    const analysis = await this.ai.run(
      "parse-resume",
      { resumeText },
      resumeAnalysisSchema,
    );
    this.validate(analysis, resumeText);
    const plan = await this.ai.run(
      "resume-probes",
      { resumeText, jobTitle, analysis },
      probePlanSchema,
    );
    if (
      plan.probes.some((probe) =>
        probe.source === "gap_fill"
          ? probe.anchorQuote !== null || probe.target !== "general"
          : !probe.anchorQuote || !resumeText.includes(probe.anchorQuote),
      )
    )
      throw new ApiError(
        "E_LLM_EVIDENCE",
        "AI题目缺少有效简历引用，未生成练习",
        502,
      );
    if (
      new Set(plan.probes.map((probe) => probe.question)).size !== 5 ||
      plan.probes.filter((probe) => probe.source === "suspicion").length > 3
    )
      throw new ApiError(
        "E_LLM_SCHEMA",
        "AI题目重复或疑点题数量超限，未生成练习",
        502,
      );
    return { analysis, probes: plan.probes };
  }
}
