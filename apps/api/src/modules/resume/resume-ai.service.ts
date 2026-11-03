import { z } from "zod";
import { Inject, Injectable } from "@nestjs/common";
import {
  resumeAnalysisSchema,
  probePlanSchema,
  type ResumeAnalysis,
} from "@face/shared";
import { DeepSeek } from "../../providers/deepseek.js";
import { OracleStore } from "../../infrastructure/database.js";
import { ApiError } from "../../infrastructure/http.js";
import { ResumeRepository } from "./resume.repository.js";
@Injectable()
export class ResumeAiService {
  constructor(
    @Inject(ResumeRepository) private readonly resumes: ResumeRepository,
    @Inject(DeepSeek) private readonly ai: DeepSeek,
    @Inject(OracleStore) private readonly db: OracleStore,
  ) {}
  async analyze(owner: string, id: string) {
    const row = await this.resumes.get(owner, id);
    const resumeText = row.EDITED_TEXT;
    if (!resumeText)
      throw new ApiError(
        "E_RESUME_UNCONFIRMED",
        "请先核对并保存简历确认文本",
        409,
      );
    const result = await this.ai.run(
      "parse-resume",
      { resumeText },
      resumeAnalysisSchema,
    );
    this.validate(result, resumeText);
    await this.db.transaction(async (runner) => {
      const rows = await this.db.rows(
        "SELECT edited_text FROM face_app.face_resumes WHERE id=:1 AND owner_id=:2 AND delete_requested_at IS NULL FOR UPDATE",
        [id, owner],
        z.object({ EDITED_TEXT: z.string().nullable() }),
        runner,
      );
      if (rows[0]?.EDITED_TEXT !== resumeText)
        throw new ApiError("E_STALE", "简历已修改，请重新解析", 409);
      await this.db.execute(
        "UPDATE face_app.face_resumes SET profile_json=:1 WHERE id=:2 AND owner_id=:3",
        [JSON.stringify(result), id, owner],
        runner,
      );
    });
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
