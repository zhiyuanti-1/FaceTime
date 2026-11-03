import { Inject, Injectable } from "@nestjs/common";
import { z } from "zod";
import { OracleStore } from "../../infrastructure/database.js";
import { ApiError } from "../../infrastructure/http.js";
import { PracticeRepository } from "./practice.repository.js";
@Injectable()
export class PracticeStateRepository {
  constructor(
    @Inject(OracleStore) private readonly db: OracleStore,
    @Inject(PracticeRepository) private readonly practice: PracticeRepository,
  ) {}
  async navigate(owner: string, id: string, index: number) {
    const practice = await this.practice.get(owner, id);
    if (!practice.turns[index])
      throw new ApiError("E_INDEX", "题号超出本场范围");
    await this.db.execute(
      "UPDATE face_app.face_sessions SET current_index=:1,updated_at=SYSTIMESTAMP WHERE id=:2 AND owner_id=:3",
      [index, id, owner],
    );
    return this.practice.get(owner, id);
  }
  async skip(owner: string, id: string, turnId: string) {
    await this.db.transaction(async (runner) => {
      const sessions = await this.db.rows(
        "SELECT id FROM face_app.face_sessions WHERE owner_id=:1 AND id=:2 AND delete_requested_at IS NULL FOR UPDATE",
        [owner, id],
        z.object({ ID: z.string() }),
        runner,
      );
      if (!sessions.length)
        throw new ApiError("E_NOT_FOUND", "未找到练习", 404);
      const rows = await this.db.rows(
        "SELECT id,answer_text FROM face_app.face_turns WHERE session_id=:1 AND id=:2",
        [id, turnId],
        z.object({ ID: z.string(), ANSWER_TEXT: z.string().nullable() }),
        runner,
      );
      if (!rows[0]) throw new ApiError("E_NOT_FOUND", "未找到题目", 404);
      if (rows[0].ANSWER_TEXT)
        throw new ApiError(
          "E_HAS_ANSWER",
          "已保存回答的题目不能跳过，请继续编辑回答",
          409,
        );
      await this.db.execute(
        "UPDATE face_app.face_turns SET status='skipped',score_json=NULL,ai_result_json=NULL,answer_revision=answer_revision+1,updated_at=SYSTIMESTAMP WHERE id=:1",
        [turnId],
        runner,
      );
      const counts = await this.db.rows(
        "SELECT COUNT(*) remaining,MIN(turn_index) next_index FROM face_app.face_turns WHERE session_id=:1 AND status NOT IN ('answered','scored','needs_review','skipped')",
        [id],
        z.object({ REMAINING: z.number(), NEXT_INDEX: z.number().nullable() }),
        runner,
      );
      const next = counts[0];
      if (!next) throw new Error("missing count");
      await this.db.execute(
        "UPDATE face_app.face_sessions SET current_index=:1,status=:2,lock_version=lock_version+1,updated_at=SYSTIMESTAMP,finished_at=CASE WHEN :3=0 THEN NVL(finished_at,SYSTIMESTAMP) ELSE NULL END WHERE id=:4",
        [
          next.NEXT_INDEX ?? 0,
          next.REMAINING ? "asking" : "finished",
          next.REMAINING,
          id,
        ],
        runner,
      );
    });
    return this.practice.get(owner, id);
  }
}
