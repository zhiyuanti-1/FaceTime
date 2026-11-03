import { Inject, Injectable } from "@nestjs/common";
import { z } from "zod";
import { dashboardSchema, diagnosticsSchema, reportSchema } from "@face/shared";
import { OracleStore } from "../../infrastructure/database.js";
import { config } from "../../config.js";
import { ReportRepository } from "../practice/report.repository.js";
import { PreferencesRepository } from "./preferences.repository.js";
import type { Account } from "../../infrastructure/http.js";
@Injectable()
export class WorkspaceService {
  constructor(
    @Inject(ReportRepository) private readonly reports: ReportRepository,
    @Inject(OracleStore) private readonly db: OracleStore,
    @Inject(PreferencesRepository)
    private readonly preferences: PreferencesRepository,
  ) {}
  async overview(account: Account) {
    const owner = account.id;
    const stats = await this.db.rows(
      "SELECT (SELECT COUNT(*) FROM face_app.face_resumes WHERE owner_id=:1 AND delete_requested_at IS NULL) resume_count,(SELECT NVL(SUM(file_size_bytes),0) FROM face_app.face_resumes WHERE owner_id=:2 AND delete_requested_at IS NULL) resume_bytes,(SELECT COUNT(*) FROM face_app.face_sessions WHERE owner_id=:3 AND delete_requested_at IS NULL) practice_count,(SELECT COUNT(*) FROM face_app.face_sessions WHERE owner_id=:4 AND delete_requested_at IS NULL AND status<>'finished') unfinished_count,(SELECT NVL(SUM(a.size_bytes),0) FROM face_app.face_audio_assets a JOIN face_app.face_sessions s ON s.id=a.session_id WHERE s.owner_id=:5 AND a.status<>'deleted') audio_bytes FROM dual",
      [owner, owner, owner, owner, owner],
      z.object({
        RESUME_COUNT: z.number(),
        RESUME_BYTES: z.number(),
        PRACTICE_COUNT: z.number(),
        UNFINISHED_COUNT: z.number(),
        AUDIO_BYTES: z.number(),
      }),
    );
    const recent = await this.db.rows(
      "SELECT s.id,s.status,s.current_index,s.job_profile_json,s.resume_id,s.updated_at,(SELECT COUNT(*) FROM face_app.face_turns t WHERE t.session_id=s.id) question_count,(SELECT COUNT(*) FROM face_app.face_turns t WHERE t.session_id=s.id AND t.answer_text IS NOT NULL) answered,(SELECT COUNT(*) FROM face_app.face_turns t WHERE t.session_id=s.id AND t.status='skipped') skipped,(SELECT COUNT(*) FROM face_app.face_reports r WHERE r.session_id=s.id) reports FROM face_app.face_sessions s WHERE s.owner_id=:1 AND s.delete_requested_at IS NULL ORDER BY s.updated_at DESC FETCH FIRST 5 ROWS ONLY",
      [owner],
      z.object({
        ID: z.string(),
        STATUS: z.string(),
        CURRENT_INDEX: z.number(),
        JOB_PROFILE_JSON: z.string(),
        RESUME_ID: z.string().nullable(),
        UPDATED_AT: z.date(),
        QUESTION_COUNT: z.number(),
        ANSWERED: z.number(),
        SKIPPED: z.number(),
        REPORTS: z.number(),
      }),
    );
    const reports = await this.db.rows(
      "SELECT r.payload_json FROM face_app.face_reports r JOIN face_app.face_sessions s ON s.id=r.session_id WHERE s.owner_id=:1 AND s.delete_requested_at IS NULL ORDER BY r.created_at DESC FETCH FIRST 1 ROW ONLY",
      [owner],
      z.object({ PAYLOAD_JSON: z.string() }),
    );
    const score = reports[0]
      ? reportSchema.parse(JSON.parse(reports[0].PAYLOAD_JSON) as unknown)
      : null;
    const job = z.object({
      weights: z.record(z.string(), z.number()).default({}),
      jobTitle: z.string().default(""),
      order: z.enum(["alternate", "knowledge_first"]).default("alternate"),
      mode: z.enum(["knowledge", "interview"]).default("knowledge"),
    });
    const preferences = await this.preferences.get(owner);
    const latest = recent[0];
    const stat = stats[0];
    return dashboardSchema.parse({
      user: account,
      resumeCount: stat?.RESUME_COUNT ?? 0,
      practiceCount: stat?.PRACTICE_COUNT ?? 0,
      unfinishedCount: stat?.UNFINISHED_COUNT ?? 0,
      defaultResumeId: preferences.defaultResumeId,
      latestScore: score
        ? {
            sessionId: score.sessionId,
            stale: await this.reports.stale(score),
            scoreKind: score.scoreKind,
            totalScore: score.totalScore,
            totalScoreRange: score.totalScoreRange,
          }
        : null,
      resumeBytes: stat?.RESUME_BYTES ?? 0,
      audioBytes: stat?.AUDIO_BYTES ?? 0,
      recent: recent.map((row) => ({
        id: row.ID,
        jobTitle: job.parse(JSON.parse(row.JOB_PROFILE_JSON) as unknown)
          .jobTitle,
        count: row.QUESTION_COUNT,
        answered: row.ANSWERED,
        skipped: row.SKIPPED,
        currentIndex: row.CURRENT_INDEX,
        status: row.STATUS,
        updatedAt: row.UPDATED_AT.toISOString(),
        hasReport: row.REPORTS > 0,
      })),
      lastConfiguration: latest
        ? {
            ...job.parse(JSON.parse(latest.JOB_PROFILE_JSON) as unknown),
            resumeId: latest.RESUME_ID,
          }
        : null,
    });
  }
  async diagnostics() {
    let database: "up" | "down" = "up";
    try {
      await this.db.execute("SELECT 1 FROM dual");
    } catch {
      database = "down";
    }
    return diagnosticsSchema.parse({
      version: "0.3.0",
      scoringVersion: "1.0.0",
      bankVersion: "1.0.0-seed",
      api: "up",
      database,
      ocr: config.BAIDU_AK && config.BAIDU_SK ? "configured" : "unconfigured",
      deepseek: config.DEEPSEEK_API_KEY ? "configured" : "unconfigured",
      cloudVerified: false,
      audioRetentionEnabled: false,
    });
  }
}
