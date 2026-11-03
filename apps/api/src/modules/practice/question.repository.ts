import { Inject, Injectable } from "@nestjs/common";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { OracleStore } from "../../infrastructure/database.js";
const bank = z.object({
  topicId: z.string(),
  name: z.string(),
  stage: z.enum(["seed", "curated"]),
  questions: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      difficulty: z.number(),
      expectedPoints: z.array(z.string()),
      verified: z.boolean(),
    }),
  ),
});
const topic = z.object({
  ID: z.string(),
  NAME: z.string(),
  STAGE: z.string(),
  COUNT: z.number(),
});
const question = z.object({
  ID: z.string(),
  TOPIC_ID: z.string(),
  QUESTION_TEXT: z.string(),
  DIFFICULTY: z.number(),
  NAME: z.string(),
  STAGE: z.string(),
});
@Injectable()
export class QuestionRepository {
  constructor(@Inject(OracleStore) private readonly db: OracleStore) {}
  async onModuleInit() {
    const root = fileURLToPath(
      new URL("../../../../../packages/content/bank/", import.meta.url),
    );
    const index = z
      .object({ topics: z.array(z.object({ file: z.string() })) })
      .parse(
        JSON.parse(
          await readFile(resolve(root, "index.json"), "utf8"),
        ) as unknown,
      );
    await this.db.transaction(async (runner) => {
      for (const entry of index.topics) {
        const data = bank.parse(
          JSON.parse(
            await readFile(resolve(root, entry.file), "utf8"),
          ) as unknown,
        );
        await this.db.execute(
          "MERGE INTO face_app.face_topics t USING (SELECT :1 id FROM dual) s ON (t.id=s.id) WHEN NOT MATCHED THEN INSERT(id,name,stage) VALUES(:2,:3,:4)",
          [data.topicId, data.topicId, data.name, data.stage],
          runner,
        );
        for (const q of data.questions)
          await this.db.execute(
            "MERGE INTO face_app.face_questions t USING (SELECT :1 id FROM dual) s ON (t.id=s.id) WHEN NOT MATCHED THEN INSERT(id,topic_id,question_text,difficulty,expected_points_json,verified) VALUES(:2,:3,:4,:5,:6,:7)",
            [
              q.id,
              q.id,
              data.topicId,
              q.text,
              q.difficulty,
              JSON.stringify(q.expectedPoints),
              q.verified ? 1 : 0,
            ],
            runner,
          );
      }
    });
  }
  async topics() {
    const rows = await this.db.rows(
      "SELECT t.id,t.name,t.stage,COUNT(q.id) AS count FROM face_app.face_topics t LEFT JOIN face_app.face_questions q ON q.topic_id=t.id AND (t.stage='seed' OR q.verified=1) GROUP BY t.id,t.name,t.stage ORDER BY t.id",
      [],
      topic,
    );
    return rows.map((t) => ({
      id: t.ID,
      name: t.NAME,
      stage: t.STAGE,
      count: t.COUNT,
    }));
  }
  async questions(topicId: string) {
    const rows = await this.db.rows(
      "SELECT q.id,q.topic_id,q.question_text,q.difficulty,t.name,t.stage FROM face_app.face_questions q JOIN face_app.face_topics t ON t.id=q.topic_id WHERE t.id=:1 AND (t.stage='seed' OR q.verified=1) ORDER BY DBMS_RANDOM.VALUE",
      [topicId],
      question,
    );
    return rows.map((q) => ({
      id: q.ID,
      kind: "knowledge" as const,
      source: null,
      confidence: null,
      anchorQuote: null,
      text: q.QUESTION_TEXT,
      topicId: q.TOPIC_ID,
      topicName: q.NAME,
      difficulty: q.DIFFICULTY,
      stage: q.STAGE,
    }));
  }
}
