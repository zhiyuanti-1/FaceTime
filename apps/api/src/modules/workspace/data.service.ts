import { Inject, Injectable } from "@nestjs/common";
import { dataExportSchema } from "@face/shared";
import { z } from "zod";
import { unlink } from "node:fs/promises";
import { OracleStore } from "../../infrastructure/database.js";
import { ResumeRepository } from "../resume/resume.repository.js";
import { ResumeService } from "../resume/resume.service.js";
import { PreferencesRepository } from "./preferences.repository.js";
import { PracticeRepository } from "../practice/practice.repository.js";
import { ReportRepository } from "../practice/report.repository.js";
import { ApiError } from "../../infrastructure/http.js";
@Injectable()
export class DataService {
  constructor(
    @Inject(OracleStore) private readonly db: OracleStore,
    @Inject(ResumeRepository) private readonly resumes: ResumeRepository,
    @Inject(ResumeService) private readonly files: ResumeService,
    @Inject(PreferencesRepository)
    private readonly preferences: PreferencesRepository,
    @Inject(PracticeRepository) private readonly practices: PracticeRepository,
    @Inject(ReportRepository) private readonly reports: ReportRepository,
  ) {}
  private async removeFile(path: string) {
    try {
      await unlink(this.files.path(path));
    } catch (error) {
      if (!(
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ))
        throw new ApiError(
          "E_DELETE_FILES",
          "文件清理未完成，请关闭占用文件后重试；未声称完全删除",
          500,
        );
    }
  }
  async removeResume(owner: string, id: string) {
    const row = await this.resumes.beginDelete(owner, id);
    await this.removeFile(row.ORIGINAL_PATH);
    const defaultId = await this.db.transaction(async (runner) => {
      await this.db.execute(
        "SELECT id FROM face_app.face_users WHERE id=:1 FOR UPDATE",
        [owner],
        runner,
      );
      const nextDefault = await this.preferences.clearResume(owner, id, runner);
      await this.db.execute(
        "UPDATE face_app.face_sessions SET resume_id=NULL WHERE owner_id=:1 AND resume_id=:2",
        [owner, id],
        runner,
      );
      await this.db.execute(
        "DELETE FROM face_app.face_resumes WHERE owner_id=:1 AND id=:2",
        [owner, id],
        runner,
      );
      return nextDefault;
    });
    return { ok: true, defaultId };
  }
  async cleanupAudio(owner: string) {
    const rows = await this.db.rows(
      "SELECT a.id,a.relative_path FROM face_app.face_audio_assets a JOIN face_app.face_sessions s ON s.id=a.session_id WHERE s.owner_id=:1 AND a.status<>'deleted'",
      [owner],
      z.object({ ID: z.string(), RELATIVE_PATH: z.string() }),
    );
    for (const row of rows) {
      await this.removeFile(row.RELATIVE_PATH);
      await this.db.execute(
        "UPDATE face_app.face_audio_assets SET status='deleted',deleted_at=SYSTIMESTAMP WHERE id=:1",
        [row.ID],
      );
    }
    return { ok: true, removed: rows.length };
  }
  async removeAll(owner: string) {
    await this.db.transaction(async (runner) => {
      await this.db.execute(
        "SELECT id FROM face_app.face_users WHERE id=:1 FOR UPDATE",
        [owner],
        runner,
      );
      await this.db.execute(
        "UPDATE face_app.face_resumes SET delete_requested_at=NVL(delete_requested_at,SYSTIMESTAMP) WHERE owner_id=:1",
        [owner],
        runner,
      );
      await this.db.execute(
        "UPDATE face_app.face_sessions SET delete_requested_at=NVL(delete_requested_at,SYSTIMESTAMP) WHERE owner_id=:1",
        [owner],
        runner,
      );
    });
    const rows = await this.db.rows(
      "SELECT original_path FROM face_app.face_resumes WHERE owner_id=:1",
      [owner],
      z.object({ ORIGINAL_PATH: z.string() }),
    );
    for (const row of rows) await this.removeFile(row.ORIGINAL_PATH);
    await this.cleanupAudio(owner);
    await this.db.transaction(async (runner) => {
      await this.db.execute(
        "SELECT id FROM face_app.face_users WHERE id=:1 FOR UPDATE",
        [owner],
        runner,
      );
      for (const sql of [
        "DELETE FROM face_app.face_rule_events WHERE turn_id IN(SELECT t.id FROM face_app.face_turns t JOIN face_app.face_sessions s ON s.id=t.session_id WHERE s.owner_id=:1)",
        "DELETE FROM face_app.face_audio_assets WHERE session_id IN(SELECT id FROM face_app.face_sessions WHERE owner_id=:1)",
        "DELETE FROM face_app.face_reports WHERE session_id IN(SELECT id FROM face_app.face_sessions WHERE owner_id=:1)",
        "DELETE FROM face_app.face_turns WHERE session_id IN(SELECT id FROM face_app.face_sessions WHERE owner_id=:1)",
        "DELETE FROM face_app.face_sessions WHERE owner_id=:1",
        "DELETE FROM face_app.face_resumes WHERE owner_id=:1",
        "DELETE FROM face_app.face_preferences WHERE user_id=:1",
      ])
        await this.db.execute(sql, [owner], runner);
    });
    return { ok: true };
  }
  async export(owner: string) {
    const resumes = await this.resumes.list(owner);
    const history = await this.practices.list(owner);
    const practices = [];
    for (const entry of history) {
      const report = await this.reports.latest(owner, entry.id);
      practices.push({
        practice: await this.practices.get(owner, entry.id),
        report: report
          ? { ...report, stale: await this.reports.stale(report) }
          : null,
      });
    }

    return dataExportSchema.parse({
      exportVersion: 1,
      exportedAt: new Date().toISOString(),
      preferences: await this.preferences.get(owner),
      resumes: await Promise.all(
        resumes.map(async (resume) =>
          this.resumes.dto(await this.resumes.get(owner, resume.id)),
        ),
      ),
      practices,
    });
  }
}
