import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  aiScoreSchema,
  evaluateAnswer,
  turnScoreSchema,
  type TurnScore,
} from "@face/shared";
import { OracleStore } from "../../infrastructure/database.js";
import { DeepSeek } from "../../providers/deepseek.js";
import { ApiError } from "../../infrastructure/http.js";
import { PracticeRepository } from "./practice.repository.js";
import { scoringRules } from "./scoring-rules.js";
@Injectable()
export class AnswerScoringService {
  private running = new Set<string>();
  constructor(
    @Inject(OracleStore) private readonly db: OracleStore,
    @Inject(DeepSeek) private readonly ai: DeepSeek,
    @Inject(PracticeRepository) private readonly practices: PracticeRepository,
  ) {}
  async score(owner: string, id: string, turnId: string): Promise<TurnScore> {
    const practice = await this.practices.get(owner, id);
    const turn = practice.turns.find((t) => t.id === turnId);
    if (!turn) throw new ApiError("E_NOT_FOUND", "未找到题目", 404);
    if (!turn.answerText.trim())
      throw new ApiError("E_ANSWER_REQUIRED", "请先保存文字回答", 409);
    const rows = await this.db.rows(
      "SELECT score_json FROM face_app.face_turns WHERE id=:1",
      [turnId],
      z.object({ SCORE_JSON: z.string().nullable() }),
    );
    const existing = rows[0]?.SCORE_JSON;
    if (existing) {
      const cached = turnScoreSchema.parse(JSON.parse(existing) as unknown);
      if (cached.answerRevision === turn.answerRevision) return cached;
    }
    if (this.running.has(turnId))
      throw new ApiError("E_AI_BUSY", "该题正在评分", 409);
    this.running.add(turnId);
    try {
      const sessions = await this.db.rows(
        "SELECT paper_json FROM face_app.face_sessions WHERE owner_id=:1 AND id=:2",
        [owner, id],
        z.object({ PAPER_JSON: z.string() }),
      );
      const paper = z
        .object({
          resumeSnapshot: z.object({ text: z.string() }).nullable().optional(),
        })
        .parse(JSON.parse(sessions[0]?.PAPER_JSON ?? "{}") as unknown);
      const resume = paper.resumeSnapshot?.text ?? "";
      const expected = await this.db.rows(
        "SELECT expected_points_json FROM face_app.face_questions WHERE id=:1",
        [turn.question.id],
        z.object({ EXPECTED_POINTS_JSON: z.string() }),
      );
      const ai = await this.ai.run(
        "score-answer",
        {
          question: turn.question,
          answer: turn.answerText,
          resumeText: resume,
          jobTitle: practice.jobTitle,
          expectedPoints: expected[0]
            ? (JSON.parse(expected[0].EXPECTED_POINTS_JSON) as unknown)
            : [],
          rules: scoringRules,
        },
        aiScoreSchema,
      );
      if (ai.resumeFlags.some((flag) => !resume.includes(flag.quote)))
        throw new ApiError(
          "E_LLM_EVIDENCE",
          "AI简历引用不存在，评分未生效",
          502,
        );
      const score = evaluateAnswer(
        ai,
        {
          answer: turn.answerText,
          resume,
          kind: turn.question.kind,
          answerRevision: turn.answerRevision,
          resumeConfidence: turn.question.confidence,
        },
        scoringRules,
      );
      await this.db.transaction(async (runner) => {
        const locks = await this.db.rows(
          "SELECT id FROM face_app.face_sessions WHERE owner_id=:1 AND id=:2 AND delete_requested_at IS NULL FOR UPDATE",
          [owner, id],
          z.object({ ID: z.string() }),
          runner,
        );
        if (!locks.length) throw new ApiError("E_NOT_FOUND", "练习已删除", 404);
        const current = await this.db.rows(
          "SELECT answer_revision FROM face_app.face_turns WHERE id=:1 AND session_id=:2",
          [turnId, id],
          z.object({ ANSWER_REVISION: z.number() }),
          runner,
        );
        if (current[0]?.ANSWER_REVISION !== turn.answerRevision)
          throw new ApiError("E_STALE", "回答已修改，请对新版本重新评分", 409);
        await this.db.execute(
          "UPDATE face_app.face_turns SET ai_result_json=:1,score_json=:2,status=:3,updated_at=SYSTIMESTAMP WHERE id=:4",
          [
            JSON.stringify(ai),
            JSON.stringify(score),
            score.needsReview ? "needs_review" : "scored",
            turnId,
          ],
          runner,
        );
        for (const [kind, list] of [
          ["DEDUCTION", score.deductions],
          ["BONUS", score.bonuses],
        ] as const)
          for (const [index, event] of list.entries())
            await this.db.execute(
              "INSERT INTO face_app.face_rule_events(id,turn_id,event_key,event_kind,rule_id,scoring_version,dimension,points,evidence,confidence,confidence_source,status,rule_snapshot_json) VALUES(:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,'model',:11,:12)",
              [
                randomUUID(),
                turnId,
                `${turn.answerRevision}:${kind}:${index}`,
                kind,
                event.ruleId,
                score.scoringVersion,
                event.dimension,
                event.points,
                event.evidence,
                event.confidence,
                event.status,
                JSON.stringify(scoringRules),
              ],
              runner,
            );
      });
      return score;
    } finally {
      this.running.delete(turnId);
    }
  }
}
