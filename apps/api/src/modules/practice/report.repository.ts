import type { QueryRunner } from "typeorm";
import { Inject, Injectable } from "@nestjs/common";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { reportSchema, type Report } from "@face/shared";
import { OracleStore } from "../../infrastructure/database.js";
import { ApiError } from "../../infrastructure/http.js";
@Injectable()
export class ReportRepository {
  constructor(@Inject(OracleStore) private readonly db: OracleStore) {}
  async latest(owner: string, id: string) {
    const rows = await this.db.rows(
      "SELECT r.payload_json FROM face_app.face_reports r JOIN face_app.face_sessions s ON s.id=r.session_id WHERE s.owner_id=:1 AND s.id=:2 AND s.delete_requested_at IS NULL ORDER BY r.revision DESC FETCH FIRST 1 ROW ONLY",
      [owner, id],
      z.object({ PAYLOAD_JSON: z.string() }),
    );
    if (!rows[0]) return null;
    return reportSchema.parse(JSON.parse(rows[0].PAYLOAD_JSON) as unknown);
  }
  async stale(report: Report, runner?: QueryRunner) {
    const rows = await this.db.rows(
      "SELECT id,answer_revision FROM face_app.face_turns WHERE session_id=:1",
      [report.sessionId],
      z.object({ ID: z.string(), ANSWER_REVISION: z.number() }),
      runner,
    );
    return (
      rows.length !== report.turns.length ||
      rows.some(
        (row) =>
          report.turns.find((turn) => turn.id === row.ID)?.answerRevision !==
          row.ANSWER_REVISION,
      )
    );
  }
  async get(owner: string, id: string) {
    const report = await this.latest(owner, id);
    if (!report)
      throw new ApiError(
        "E_REPORT_MISSING",
        "尚未生成报告，请先完成练习并生成报告",
        404,
      );
    return { ...report, stale: await this.stale(report) };
  }
  async save(owner: string, report: Report) {
    return this.db.transaction(async (runner) => {
      const sessions = await this.db.rows(
        "SELECT id FROM face_app.face_sessions WHERE owner_id=:1 AND id=:2 AND delete_requested_at IS NULL FOR UPDATE",
        [owner, report.sessionId],
        z.object({ ID: z.string() }),
        runner,
      );
      if (!sessions.length)
        throw new ApiError("E_NOT_FOUND", "练习已删除", 404);
      if (await this.stale(report, runner))
        throw new ApiError("E_STALE", "回答已修改，请重新生成报告", 409);
      const counts = await this.db.rows(
        "SELECT NVL(MAX(revision),0) value FROM face_app.face_reports WHERE session_id=:1",
        [report.sessionId],
        z.object({ VALUE: z.number() }),
        runner,
      );
      const result = reportSchema.parse({
        ...report,
        id: randomUUID(),
        revision: (counts[0]?.VALUE ?? 0) + 1,
      });
      await this.db.execute(
        "INSERT INTO face_app.face_reports(id,session_id,revision,score_kind,total_score,range_low,range_high,coverage,payload_json,scoring_version,prompt_version,bank_version) VALUES(:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11,:12)",
        [
          result.id,
          result.sessionId,
          result.revision,
          result.scoreKind,
          result.totalScore,
          result.totalScoreRange?.[0] ?? null,
          result.totalScoreRange?.[1] ?? null,
          result.coverage,
          JSON.stringify(result),
          result.scoringVersion,
          result.promptVersion,
          result.bankVersion,
        ],
        runner,
      );
      return result;
    });
  }
}
