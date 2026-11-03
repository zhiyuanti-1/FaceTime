import { Inject, Injectable } from "@nestjs/common";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import {
  publicQuestionSchema,
  practiceSchema,
  type CreatePractice,
  type Practice,
} from "@face/shared";
import { OracleStore } from "../../infrastructure/database.js";
import { ApiError } from "../../infrastructure/http.js";
const session = z.object({
  ID: z.string(),
  STATUS: z.string(),
  RESUME_ID: z.string().nullable(),
  JOB_PROFILE_JSON: z.string(),
  WARNINGS_JSON: z.string(),
  CREATED_AT: z.date(),
  UPDATED_AT: z.date(),
});
const turn = z.object({
  ID: z.string(),
  TURN_INDEX: z.number(),
  QUESTION_JSON: z.string(),
  ANSWER_TEXT: z.string().nullable(),
  STATUS: z.string(),
});
@Injectable()
export class PracticeRepository {
  constructor(@Inject(OracleStore) private readonly db: OracleStore) {}
  async create(
    owner: string,
    body: CreatePractice,
    questions: z.infer<typeof publicQuestionSchema>[],
  ) {
    const id = randomUUID();
    const warnings = questions.some((q) => q.stage === "seed")
      ? ["占位题库，质量未校验；本轮只保存回答，不评分"]
      : [];
    await this.db.transaction(async (runner) => {
      await this.db.execute(
        "INSERT INTO face_app.face_sessions(id,owner_id,resume_id,job_profile_json,paper_json,versions_json,status,warnings_json) VALUES(:1,:2,:3,:4,:5,:6,'asking',:7)",
        [
          id,
          owner,
          body.resumeId,
          JSON.stringify({
            weights: body.weights,
            count: body.count,
            mode: "knowledge",
          }),
          JSON.stringify({
            knowledge: questions,
            order: questions.map((q) => q.id),
          }),
          JSON.stringify({
            schemaVersion: 1,
            bank: "1.0.0-seed",
            scoring: "disabled",
          }),
          JSON.stringify(warnings),
        ],
        runner,
      );
      for (const [index, q] of questions.entries())
        await this.db.execute(
          "INSERT INTO face_app.face_turns(id,session_id,turn_index,question_json,request_key) VALUES(:1,:2,:3,:4,:5)",
          [randomUUID(), id, index, JSON.stringify(q), q.id],
          runner,
        );
    });
    return this.get(owner, id);
  }
  async get(owner: string, id: string): Promise<Practice> {
    const sessions = await this.db.rows(
      "SELECT * FROM face_app.face_sessions WHERE owner_id=:1 AND id=:2 AND delete_requested_at IS NULL",
      [owner, id],
      session,
    );
    const value = sessions[0];
    if (!value) throw new ApiError("E_NOT_FOUND", "未找到这场练习", 404);
    const turns = await this.db.rows(
      "SELECT id,turn_index,question_json,answer_text,status FROM face_app.face_turns WHERE session_id=:1 ORDER BY turn_index",
      [id],
      turn,
    );
    const job = z
      .object({ weights: z.record(z.string(), z.number()) })
      .parse(JSON.parse(value.JOB_PROFILE_JSON) as unknown);
    return practiceSchema.parse({
      id: value.ID,
      status: value.STATUS,
      resumeId: value.RESUME_ID,
      weights: job.weights,
      turns: turns.map((t) => ({
        id: t.ID,
        index: t.TURN_INDEX,
        question: JSON.parse(t.QUESTION_JSON) as unknown,
        answerText: t.ANSWER_TEXT ?? "",
        status: t.STATUS,
      })),
      warnings: JSON.parse(value.WARNINGS_JSON) as unknown,
      createdAt: value.CREATED_AT.toISOString(),
      updatedAt: value.UPDATED_AT.toISOString(),
    });
  }
  async list(owner: string) {
    const rows = await this.db.rows(
      "SELECT s.id,s.status,s.created_at,s.updated_at,(SELECT COUNT(*) FROM face_app.face_turns t WHERE t.session_id=s.id) question_count,(SELECT COUNT(*) FROM face_app.face_turns t WHERE t.session_id=s.id AND t.status='answered') answered_count FROM face_app.face_sessions s WHERE s.owner_id=:1 AND s.delete_requested_at IS NULL ORDER BY s.updated_at DESC",
      [owner],
      session
        .pick({ ID: true, STATUS: true, CREATED_AT: true, UPDATED_AT: true })
        .extend({ QUESTION_COUNT: z.number(), ANSWERED_COUNT: z.number() }),
    );
    return rows.map((s) => ({
      id: s.ID,
      status: s.STATUS,
      count: s.QUESTION_COUNT,
      answered: s.ANSWERED_COUNT,
      createdAt: s.CREATED_AT.toISOString(),
      updatedAt: s.UPDATED_AT.toISOString(),
    }));
  }
  async answer(owner: string, id: string, turnId: string, text: string) {
    await this.db.transaction(async (runner) => {
      const sessions = await this.db.rows(
        "SELECT id FROM face_app.face_sessions WHERE id=:1 AND owner_id=:2 AND delete_requested_at IS NULL FOR UPDATE",
        [id, owner],
        z.object({ ID: z.string() }),
        runner,
      );
      if (!sessions.length)
        throw new ApiError("E_NOT_FOUND", "未找到这场练习", 404);
      const turns = await this.db.rows(
        "SELECT id FROM face_app.face_turns WHERE id=:1 AND session_id=:2",
        [turnId, id],
        z.object({ ID: z.string() }),
        runner,
      );
      if (!turns.length) throw new ApiError("E_NOT_FOUND", "未找到这道题", 404);
      await this.db.execute(
        "UPDATE face_app.face_turns SET answer_text=:1,status='answered',answer_revision=answer_revision+1,updated_at=SYSTIMESTAMP WHERE id=:2 AND session_id=:3",
        [text, turnId, id],
        runner,
      );
      const counts = await this.db.rows(
        "SELECT COUNT(*) remaining,MIN(turn_index) next_index FROM face_app.face_turns WHERE session_id=:1 AND status<>'answered'",
        [id],
        z.object({ REMAINING: z.number(), NEXT_INDEX: z.number().nullable() }),
        runner,
      );
      const next = counts[0];
      if (!next) throw new Error("count missing");
      await this.db.execute(
        "UPDATE face_app.face_sessions SET status=:1,current_index=:2,lock_version=lock_version+1,updated_at=SYSTIMESTAMP,finished_at=CASE WHEN :3=0 THEN NVL(finished_at,SYSTIMESTAMP) ELSE NULL END WHERE id=:4 AND owner_id=:5",
        [
          next.REMAINING === 0 ? "finished" : "asking",
          next.NEXT_INDEX ?? 0,
          next.REMAINING,
          id,
          owner,
        ],
        runner,
      );
    });
    return this.get(owner, id);
  }
}
