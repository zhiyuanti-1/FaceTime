import type { QueryRunner } from "typeorm";
import { Inject, Injectable } from "@nestjs/common";
import { z } from "zod";
import { preferencesSchema, type Preferences } from "@face/shared";
import { OracleStore } from "../../infrastructure/database.js";
import { ResumeRepository } from "../resume/resume.repository.js";
@Injectable()
export class PreferencesRepository {
  constructor(
    @Inject(OracleStore) private readonly db: OracleStore,
    @Inject(ResumeRepository) private readonly resumes: ResumeRepository,
  ) {}
  async get(owner: string, runner?: QueryRunner): Promise<Preferences> {
    const rows = await this.db.rows(
      "SELECT preferences_json FROM face_app.face_preferences WHERE user_id=:1",
      [owner],
      z.object({ PREFERENCES_JSON: z.string() }),
      runner,
    );
    const row = rows[0];
    return preferencesSchema.parse(
      row ? (JSON.parse(row.PREFERENCES_JSON) as unknown) : {},
    );
  }
  async put(owner: string, preferences: Preferences) {
    return this.db.transaction(async (runner) => {
      await this.db.execute(
        "SELECT id FROM face_app.face_users WHERE id=:1 FOR UPDATE",
        [owner],
        runner,
      );
      if (preferences.defaultResumeId)
        await this.resumes.get(owner, preferences.defaultResumeId, runner);
      await this.write(owner, preferences, runner);
      return preferences;
    });
  }
  private async write(
    owner: string,
    preferences: Preferences,
    runner: QueryRunner,
  ) {
    await this.db.execute(
      "MERGE INTO face_app.face_preferences p USING(SELECT :1 id FROM dual) s ON(p.user_id=s.id) WHEN MATCHED THEN UPDATE SET preferences_json=:2,updated_at=SYSTIMESTAMP WHEN NOT MATCHED THEN INSERT(user_id,preferences_json) VALUES(:3,:4)",
      [owner, JSON.stringify(preferences), owner, JSON.stringify(preferences)],
      runner,
    );
  }
  async clearResume(owner: string, id: string, runner: QueryRunner) {
    const preferences = await this.get(owner, runner);
    if (preferences.defaultResumeId === id) {
      const rows = await this.db.rows(
        "SELECT id FROM face_app.face_resumes WHERE owner_id=:1 AND id<>:2 AND delete_requested_at IS NULL ORDER BY updated_at DESC,id FETCH FIRST 1 ROW ONLY",
        [owner, id],
        z.object({ ID: z.string() }),
        runner,
      );
      preferences.defaultResumeId = rows[0]?.ID ?? null;
      await this.write(owner, preferences, runner);
    }
    return preferences.defaultResumeId;
  }
}
