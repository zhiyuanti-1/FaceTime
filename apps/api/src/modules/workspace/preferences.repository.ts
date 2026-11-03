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
  async get(owner: string): Promise<Preferences> {
    const rows = await this.db.rows(
      "SELECT preferences_json FROM face_app.face_preferences WHERE user_id=:1",
      [owner],
      z.object({ PREFERENCES_JSON: z.string() }),
    );
    const row = rows[0];
    return preferencesSchema.parse(
      row ? (JSON.parse(row.PREFERENCES_JSON) as unknown) : {},
    );
  }
  async put(owner: string, preferences: Preferences) {
    if (preferences.defaultResumeId)
      await this.resumes.get(owner, preferences.defaultResumeId);
    await this.db.execute(
      "MERGE INTO face_app.face_preferences p USING(SELECT :1 id FROM dual) s ON(p.user_id=s.id) WHEN MATCHED THEN UPDATE SET preferences_json=:2,updated_at=SYSTIMESTAMP WHEN NOT MATCHED THEN INSERT(user_id,preferences_json) VALUES(:3,:4)",
      [owner, JSON.stringify(preferences), owner, JSON.stringify(preferences)],
    );
    return preferences;
  }
  async clearResume(owner: string, id: string) {
    const preferences = await this.get(owner);
    if (preferences.defaultResumeId === id)
      await this.put(owner, { ...preferences, defaultResumeId: null });
  }
}
