// Local integration verification. Uses only synthetic data; never prints credentials.
import "reflect-metadata";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { config, dataRoot } from "../apps/api/dist/config.js";
import { OracleStore } from "../apps/api/dist/infrastructure/database.js";
import { ResumeRepository } from "../apps/api/dist/modules/resume/resume.repository.js";
import { PracticeRepository } from "../apps/api/dist/modules/practice/practice.repository.js";
const db = new OracleStore();
const base = `http://${config.API_HOST}:${config.API_PORT}/api/v1`;
let cookie = "";
let resumeId;
let practiceId;
let pdfId;
let original;
let pdfOriginal;
async function call(path, body, method = "GET") {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
    },
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
  });
  const next = response.headers.get("set-cookie");
  if (next) cookie = next.split(";")[0];
  return { status: response.status, body: await response.json() };
}
async function upload(name, text) {
  const form = new FormData();
  form.set("file", new Blob([text]), name);
  return call("/resumes", form, "POST");
}
try {
  assert.equal((await call("/resumes")).status, 401);
  assert.equal(
    (
      await call(
        "/auth/login",
        { username: config.ADMIN_USERNAME, password: config.ADMIN_PASSWORD },
        "POST",
      )
    ).status,
    201,
  );
  const topics = await call("/topics");
  assert.equal(topics.status, 200);
  assert.equal(topics.body.length, 10);
  const raw =
    "合成测试简历\n技能：TypeScript / Oracle\n 项目描述保留空格 \n" +
    "合成内容".repeat(10000);
  const resume = await upload("synthetic-verification.txt", raw);
  resumeId = resume.body.id;
  assert.equal(resume.status, 201);
  assert.equal(resume.body.status, "ready");
  assert.equal(resume.body.rawText, raw);
  const owner = await call("/auth/me");
  const resumes = new ResumeRepository(db);
  const practices = new PracticeRepository(db);
  original = (await resumes.get(owner.body.id, resumeId)).ORIGINAL_PATH;
  await assert.rejects(resumes.get(randomUUID(), resumeId));
  const edited = raw + "确认补充内容";
  assert.equal(
    (await call(`/resumes/${resumeId}/text`, { text: edited }, "PUT")).status,
    200,
  );
  const persisted = (await call(`/resumes/${resumeId}`)).body;
  assert.equal(persisted.rawText, raw);
  assert.equal(persisted.editedText, edited.trim());
  const file = await fetch(base + `/resumes/${resumeId}/file`, {
    headers: { Cookie: cookie },
  });
  assert.equal(await file.text(), raw);
  const ids = topics.body.slice(0, 2).map((topic) => topic.id);
  const practice = await call(
    "/practices",
    { weights: { [ids[0]]: 3, [ids[1]]: 2 }, count: 5, resumeId },
    "POST",
  );
  practiceId = practice.body.id;
  assert.equal(practice.status, 201);
  assert.equal(practice.body.turns.length, 5);
  assert.equal(
    practice.body.turns.filter((t) => t.question.topicId === ids[0]).length,
    3,
  );
  await assert.rejects(practices.get(randomUUID(), practiceId));
  await assert.rejects(
    practices.answer(
      randomUUID(),
      practiceId,
      practice.body.turns[0].id,
      "forbidden",
    ),
  );
  for (const turn of practice.body.turns) {
    assert.equal(
      (
        await call(
          `/practices/${practiceId}/answers/${turn.id}`,
          { text: "合成测试回答：" + turn.index + "验证".repeat(7000) },
          "PUT",
        )
      ).status,
      200,
    );
  }
  const saved = (await call(`/practices/${practiceId}`)).body;
  assert.equal(saved.status, "finished");
  assert(
    saved.turns.every((turn) => turn.answerText.startsWith("合成测试回答")),
  );
  assert.equal(
    (
      await call(
        `/practices/${practiceId}/answers/not-a-turn`,
        { text: "wrong turn" },
        "PUT",
      )
    ).status,
    404,
  );
  const history = (await call("/practices")).body;
  assert.equal(history.find((p) => p.id === practiceId).answered, 5);
  const unsupported = await upload("not-supported.png", "fake");
  assert.equal(unsupported.status, 400);
  if (!config.BAIDU_AK || !config.BAIDU_SK) {
    const pdf = await upload(
      "synthetic-unconfigured.pdf",
      "%PDF-1.4\nsynthetic",
    );
    pdfId = pdf.body.id;
    assert.equal(pdf.body.status, "failed");
    assert.equal(pdf.body.rawText, "");
    pdfOriginal = (await resumes.get(owner.body.id, pdfId)).ORIGINAL_PATH;
    assert(pdf.body.error.includes("尚未配置"));
    assert.equal(
      (await call(`/resumes/${pdfId}/recognize`, {}, "POST")).body.status,
      "failed",
    );
  }
  await call("/auth/logout", {}, "POST");
  assert.equal((await call("/resumes")).status, 401);
  console.info(
    "PASS: Oracle login, upload/raw fidelity, correction persistence, original download, owner isolation, weighted DB questions, all answers/history, invalid inputs, logout.",
  );
  console.info(
    !config.BAIDU_AK || !config.BAIDU_SK
      ? "PASS: unconfigured OCR retention/retry."
      : "SKIP: real OCR network; configured credentials remain unused by this verification.",
  );
} finally {
  // Cleanup is limited to UUIDs created by this run, never pre-existing user data.
  if (practiceId) {
    await db.execute("DELETE FROM face_app.face_turns WHERE session_id=:1", [
      practiceId,
    ]);
    await db.execute("DELETE FROM face_app.face_sessions WHERE id=:1", [
      practiceId,
    ]);
  }
  for (const id of [resumeId, pdfId].filter(Boolean))
    await db.execute("DELETE FROM face_app.face_resumes WHERE id=:1", [id]);
  for (const path of [original, pdfOriginal].filter(Boolean))
    await unlink(resolve(dataRoot, path));
  await db.onModuleDestroy();
}
