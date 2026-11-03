import { Inject, Injectable } from "@nestjs/common";
import { z } from "zod";
import {
  aggregateDimensions,
  applySessionBonusCaps,
  turnScoreSchema,
  aiScoreSchema,
  finalSummarySchema,
  type Report,
  type Practice,
  type TurnScore,
} from "@face/shared";
import { OracleStore } from "../../infrastructure/database.js";
import { DeepSeek } from "../../providers/deepseek.js";
import { ApiError } from "../../infrastructure/http.js";
import { PracticeRepository } from "./practice.repository.js";
import { AnswerScoringService } from "./answer-scoring.service.js";
import { ReportRepository } from "./report.repository.js";
import { scoringRules } from "./scoring-rules.js";
@Injectable()
export class ReportService {
  private running = new Set<string>();
  constructor(
    @Inject(OracleStore) private readonly db: OracleStore,
    @Inject(DeepSeek) private readonly ai: DeepSeek,
    @Inject(PracticeRepository) private readonly practices: PracticeRepository,
    @Inject(AnswerScoringService) private readonly scores: AnswerScoringService,
    @Inject(ReportRepository) private readonly reports: ReportRepository,
  ) {}
  async create(owner: string, id: string) {
    const practice = await this.practices.get(owner, id);
    if (
      practice.turns.some(
        (turn) => !turn.answerText && turn.status !== "skipped",
      )
    )
      throw new ApiError(
        "E_PRACTICE_INCOMPLETE",
        "请先回答或跳过全部题目",
        409,
      );
    const old = await this.reports.latest(owner, id);
    if (
      old &&
      !(await this.reports.stale(old)) &&
      old.turns.every(
        (turn) => turn.status === "skipped" || turn.score !== null,
      ) &&
      (old.summary !== null ||
        !old.turns.some((t) =>
          t.score?.dimensions.some((d) => d.status === "SCORED"),
        ))
    )
      return old;
    if (this.running.has(id))
      throw new ApiError("E_AI_BUSY", "本场正在生成报告", 409);
    this.running.add(id);
    try {
      const failures: string[] = [];
      for (const turn of practice.turns.filter((t) => t.answerText)) {
        try {
          await this.scores.score(owner, id, turn.id);
        } catch (error) {
          if (error instanceof ApiError) {
            if (error.getStatus() === 503) throw error;
            failures.push(`第${turn.index + 1}题评分未完成：${error.message}`);
          } else throw error;
        }
      }
      const report = await this.compose(owner, practice, failures);
      if (
        report.turns.some((t) =>
          t.score?.dimensions.some((d) => d.status === "SCORED"),
        )
      ) {
        try {
          const summary = await this.ai.run(
            "final-report",
            {
              jobTitle: practice.jobTitle,
              turns: report.turns,
              dimensions: report.dimensions,
            },
            finalSummarySchema,
          );
          report.summary = summary.summary;
          report.strengths = summary.strengths;
          report.improvements = summary.improvements;
        } catch (error) {
          if (!(error instanceof ApiError)) throw error;
          report.warnings.push("AI总结暂不可用，可依据逐题结果复核");
        }
      }
      return this.reports.save(owner, report);
    } finally {
      this.running.delete(id);
    }
  }
  private async compose(
    owner: string,
    practice: Practice,
    failures: string[],
  ): Promise<Report> {
    const rows = await this.db.rows(
      "SELECT t.id,t.score_json,t.ai_result_json FROM face_app.face_turns t JOIN face_app.face_sessions s ON s.id=t.session_id WHERE t.session_id=:1 AND s.owner_id=:2",
      [practice.id, owner],
      z.object({
        ID: z.string(),
        SCORE_JSON: z.string().nullable(),
        AI_RESULT_JSON: z.string().nullable(),
      }),
    );
    const turns = practice.turns.map((turn) => {
      const row = rows.find((r) => r.ID === turn.id);
      const score = row?.SCORE_JSON
        ? turnScoreSchema.parse(JSON.parse(row.SCORE_JSON) as unknown)
        : null;
      return {
        id: turn.id,
        question: turn.question.text,
        answerText: turn.answerText,
        status: turn.status,
        answerRevision: turn.answerRevision,
        score: score?.answerRevision === turn.answerRevision ? score : null,
      };
    });
    const validTurns = turns.filter(
      (turn): turn is typeof turn & { score: TurnScore } => turn.score !== null,
    );
    const capped = applySessionBonusCaps(
      validTurns.map((turn) => {
        const stored = rows.find((row) => row.ID === turn.id);
        const ai = aiScoreSchema.parse(
          JSON.parse(stored?.AI_RESULT_JSON ?? "null") as unknown,
        );
        return { score: turn.score, bases: ai.bases };
      }),
      scoringRules,
    );
    for (const [index, turn] of validTurns.entries())
      turn.score = capped[index] ?? turn.score;
    const dimensions: TurnScore["dimensions"] = Object.entries(
      scoringRules.dimensions,
    ).map(([code, config]) => {
      const valid = turns.flatMap(
        (t) =>
          t.score?.dimensions.filter(
            (d) => d.code === code && d.status === "SCORED" && d.raw !== null,
          ) ?? [],
      );
      const raw = valid.length
        ? valid.reduce((sum, d) => sum + (d.raw ?? 0), 0) / valid.length
        : null;
      return {
        code: code as TurnScore["dimensions"][number]["code"],
        ...config,
        raw,
        score: raw === null ? null : (raw / config.rawMax) * 100,
        status:
          raw !== null
            ? "SCORED"
            : code === "BODY"
              ? "NOT_ENABLED"
              : code === "FLUENCY" || code === "FILLER"
                ? "NOT_APPLICABLE"
                : "NEEDS_REVIEW",
      };
    });
    const scores = turns.flatMap((t) => (t.score ? [t.score] : []));
    const force =
      scores.some((s) => s.scoreKind === "interval") ||
      turns.some((t) => !t.score || t.score.needsReview);
    const aggregate = aggregateDimensions(dimensions, force, scoringRules);
    const skipped = practice.turns.filter((t) => t.status === "skipped").length;
    const unscored = turns.filter(
      (t) => t.status !== "skipped" && !t.score,
    ).length;
    const resumeFlags = rows.flatMap((row) =>
      row.AI_RESULT_JSON
        ? aiScoreSchema.parse(JSON.parse(row.AI_RESULT_JSON) as unknown)
            .resumeFlags
        : [],
    );
    return {
      id: "pending",
      sessionId: practice.id,
      revision: 0,
      createdAt: new Date().toISOString(),
      stale: false,
      scoringVersion: scoringRules.version,
      promptVersion: scoringRules.promptVersion,
      bankVersion: "1.0.0-seed",
      ...aggregate,
      dimensions: dimensions.map((d) => ({
        ...d,
        score: d.score === null ? null : Math.round(d.score * 10) / 10,
      })),
      deductions: turns.flatMap(
        (t) => t.score?.deductions.map((e) => ({ ...e, turnId: t.id })) ?? [],
      ),
      bonuses: turns.flatMap(
        (t) => t.score?.bonuses.map((e) => ({ ...e, turnId: t.id })) ?? [],
      ),
      needsReview: force || aggregate.scoreKind === null,
      reviewLog: scores.flatMap((s) => s.reviewLog),
      warnings: [
        ...practice.warnings,
        ...failures,
        `已跳过${skipped}题，未评分${unscored}题；文字作答不评流畅度和口头禅，动作未启用`,
      ],
      resumeQuestionCount: practice.resumeQuestionCount,
      answeredCount: practice.turns.filter((t) => t.answerText).length,
      skippedCount: skipped,
      unscoredCount: unscored,
      scoredCount: scores.filter((s) => !s.needsReview && s.scoreKind !== null)
        .length,
      needsReviewCount: scores.filter(
        (s) => s.needsReview || s.scoreKind === null,
      ).length,
      summary: null,
      strengths: [],
      improvements: [],
      turns,
      resumeFlags,
    };
  }
}
