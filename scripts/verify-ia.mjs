// CR-1.0-012: real Oracle/Nest HTTP integration with mock AI transport ONLY in this test process.
import "reflect-metadata";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { AppModule } from "../apps/api/dist/app.module.js";
import { OracleStore } from "../apps/api/dist/infrastructure/database.js";
import { Errors } from "../apps/api/dist/infrastructure/http.js";
import { DataService } from "../apps/api/dist/modules/workspace/data.service.js";
import { hashPassword } from "../apps/api/dist/modules/auth/password.js";
import { config } from "../apps/api/dist/config.js";
import { dashboardSchema, reportSchema, dataExportSchema } from "@face/shared";
const originalFetch = globalThis.fetch;
const replies = [];
let aiCalls = 0;
globalThis.fetch = async (input, init) => {
  if (String(input).startsWith("https://api.deepseek.com/")) {
    aiCalls++;
    const reply = replies.shift();
    assert(reply, "unexpected paid AI request blocked");
    const payload = JSON.parse(String(init.body));
    const user = JSON.parse(payload.messages[1].content);
    return new Response(
      JSON.stringify({
        choices: [
          {
            finish_reason: "stop",
            message: {
              content: JSON.stringify(
                typeof reply === "function" ? reply(user) : reply,
              ),
            },
          },
        ],
      }),
    );
  }
  return originalFetch(input, init);
};
config.DEEPSEEK_API_KEY = randomUUID();
const app = await NestFactory.create(AppModule, {
  logger: false,
  abortOnError: false,
});
app.use(cookieParser());
app.useGlobalFilters(new Errors());
await app.listen(0, "127.0.0.1");
const base = (await app.getUrl()) + "/api/v1";
const db = app.get(OracleStore);
const id = randomUUID();
const username = "ia_" + id.slice(0, 8);
const password = randomUUID();
let cookie = "";
let created = false;
let stage = "initialization";
async function call(path, body, method = "GET") {
  const response = await originalFetch(base + path, {
    method,
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const next = response.headers.get("set-cookie");
  if (next) cookie = next.split(";")[0];
  return { status: response.status, body: await response.json() };
}
const resumeText =
  "合成测试资料，非真实个人简历。目标：前端工程师。项目：构建React练习系统，负责表单与Oracle接口联调。工作中记录测试证据并核对用户输入。";
const quote = "构建React练习系统，负责表单与Oracle接口联调";
const analysis = {
  summary: "合成项目经历",
  name: null,
  targetRole: "前端工程师",
  projects: [{ name: "练习系统", quote, questions: ["如何验证接口？"] }],
  suspicions: [],
};
function score(input) {
  return {
    status: "scored",
    confidence: 0.9,
    bases: {
      content: 40,
      resume: input.question.kind === "resume" ? 12 : null,
      fit: 8,
    },
    scores: {
      content: 32,
      resume: input.question.kind === "resume" ? 12 : null,
      fit: 8,
      filler: null,
      body: null,
    },
    deductions: [
      {
        ruleId: "CNT-002",
        dimension: "CONTENT",
        points: 8,
        evidence: "合成测试回答",
        resumeQuote: null,
        confidence: 0.9,
      },
    ],
    bonuses: [],
    followUp: null,
    resumeFlags: [],
    improvements: ["补充具体例子"],
    needsReview: false,
  };
}
try {
  await db.execute(
    "INSERT INTO face_app.face_users(id,username,password_hash) VALUES(:1,:2,:3)",
    [id, username, hashPassword(password)],
  );
  created = true;
  stage = "authentication";
  assert.equal((await call("/dashboard")).status, 401);
  assert.equal(
    (await call("/auth/login", { username, password }, "POST")).status,
    201,
  );
  stage = "empty overview";
  const empty = dashboardSchema.parse((await call("/dashboard")).body);
  assert.equal(empty.practiceCount, 0);
  assert.equal(empty.latestScore, null);
  stage = "paste and analysis";
  const pasted = await call(
    "/resumes/paste",
    { text: resumeText, filename: "synthetic-ia.txt" },
    "POST",
  );
  assert.equal(pasted.status, 201);
  const resumeId = pasted.body.id;
  assert.equal(pasted.body.rawText, resumeText);
  assert.equal(pasted.body.needsReview, false);
  replies.push(analysis);
  assert.equal(
    (await call(`/resumes/${resumeId}/analyze`, {}, "POST")).status,
    201,
  );
  const weights = { js: 30, vue: 20, react: 20, network: 20, engineering: 10 };
  stage = "preferences";
  assert.equal(
    (
      await call(
        "/me/preferences",
        {
          jobTitle: "合成岗位",
          order: "alternate",
          weights,
          defaultResumeId: resumeId,
        },
        "PUT",
      )
    ).status,
    200,
  );
  assert.equal((await call("/me/preferences")).body.defaultResumeId, resumeId);
  stage = "quota preview";
  const preview = await call(
    "/practices/preview",
    { weights, count: 10, mode: "interview" },
    "POST",
  );
  assert.equal(preview.status, 201);
  assert.equal(
    preview.body.quotas.reduce((sum, q) => sum + q.count, 0),
    5,
  );
  stage = "AI anchored interview";
  replies.push(analysis, {
    probes: Array.from({ length: 5 }, (_, i) => ({
      source: "project",
      target: "练习系统",
      question: `项目中如何处理第${i + 1}类接口问题？`,
      anchorQuote: quote,
      severity: 1,
      confidence: 0.9,
    })),
  });
  const generated = await call(
    "/practices",
    {
      weights,
      count: 10,
      mode: "interview",
      jobTitle: "前端工程师",
      order: "alternate",
      resumeId,
    },
    "POST",
  );
  assert.equal(generated.status, 201);
  const practice = generated.body;
  assert.equal(practice.turns.length, 10);
  assert.equal(practice.resumeQuestionCount, 5);
  assert.equal(practice.turns[1].question.kind, "resume");
  assert.equal(
    (await call(`/practices/${practice.id}/report`, {}, "POST")).status,
    409,
  );
  stage = "answers and progress";
  for (const turn of practice.turns)
    assert.equal(
      (
        await call(
          `/practices/${practice.id}/answers/${turn.id}`,
          {
            text: "合成测试回答：先明确职责和输入，再实现接口，最后以集成测试核对持久化结果。",
          },
          "PUT",
        )
      ).status,
      200,
    );
  assert.equal(
    (await call(`/practices/${practice.id}/progress`, { index: 4 }, "PUT")).body
      .currentIndex,
    4,
  );
  stage = "report";
  for (let i = 0; i < 10; i++) replies.push(score);
  replies.push({
    summary: "合成测试总结",
    strengths: ["有实施步骤"],
    improvements: ["补充案例证据"],
  });
  const response = await call(`/practices/${practice.id}/report`, {}, "POST");
  assert.equal(response.status, 201);
  let report = reportSchema.parse(response.body);
  assert.equal(report.scoredCount, 10);
  assert.equal(report.skippedCount, 0);
  assert.equal(
    report.dimensions.find((d) => d.code === "BODY").status,
    "NOT_ENABLED",
  );
  assert.equal(
    report.dimensions.find((d) => d.code === "FILLER").status,
    "NOT_APPLICABLE",
  );
  assert(report.deductions.every((e) => e.points === 8 && e.turnId));
  assert.equal(report.stale, false);
  stage = "cache";
  const before = aiCalls;
  assert.equal(
    (await call(`/practices/${practice.id}/report`, {}, "POST")).body.id,
    report.id,
  );
  assert.equal(aiCalls, before);
  stage = "stale report and rescore";
  await call(
    `/practices/${practice.id}/answers/${practice.turns[0].id}`,
    {
      text: "合成测试回答：修订后给出具体实现步骤和测试证据，并核对异常场景与结果。",
    },
    "PUT",
  );
  assert.equal(
    (await call(`/practices/${practice.id}/report`)).body.stale,
    true,
  );
  replies.push(score, {
    summary: "修订后的合成总结",
    strengths: [],
    improvements: [],
  });
  const revised = await call(`/practices/${practice.id}/report`, {}, "POST");
  assert.equal(revised.status, 201);
  assert.equal(revised.body.revision, 2);
  stage = "diagnostics and export";
  const diagnostics = (await call("/me/diagnostics")).body;
  assert.equal(diagnostics.cloudVerified, false);
  const exported = dataExportSchema.parse((await call("/me/data/export")).body);
  assert.equal(exported.practices.length, 1);
  const serialized = JSON.stringify(exported);
  assert(!serialized.includes(config.DB_PASSWORD));
  assert(!serialized.includes("password_hash"));
  assert(!serialized.includes("token_hash"));
  stage = "resume deletion preserves history";
  assert.equal(
    (await call(`/resumes/${resumeId}`, { confirmation: "DELETE" }, "DELETE"))
      .status,
    200,
  );
  assert.equal((await call(`/resumes/${resumeId}`)).status, 404);
  assert.equal((await call(`/practices/${practice.id}/report`)).status, 200);
  assert.equal((await call("/me/preferences")).body.defaultResumeId, null);
  stage = "skipping";
  const single = (
    await call(
      "/practices",
      { weights: { js: 1 }, count: 1, resumeId: null },
      "POST",
    )
  ).body;
  assert.equal(
    (
      await call(
        `/practices/${single.id}/turns/${single.turns[0].id}/skip`,
        {},
        "POST",
      )
    ).body.status,
    "finished",
  );
  const skipped = (await call(`/practices/${single.id}/report`, {}, "POST"))
    .body;
  assert.equal(skipped.skippedCount, 1);
  assert.equal(skipped.totalScore, null);
  stage = "explicit delete and cleanup";
  assert.equal((await call("/me/data", {}, "DELETE")).status, 400);
  assert.equal(
    (await call("/me/data", { confirmation: "DELETE" }, "DELETE")).status,
    200,
  );
  assert.equal((await call("/dashboard")).body.practiceCount, 0);
  assert.equal((await call("/dashboard")).body.resumeCount, 0);
  assert.equal(replies.length, 0);
  console.info(
    "PASS: IA API with real Oracle: preferences, truthful overview, paste/analysis, 5+5 anchored interview, progress, 10 scores, immutable reports/cache/staleness, privacy-safe diagnostics/export, skip, owner-scoped deletion. AI mocked; no real cloud request.",
  );
} catch (error) {
  console.error("IA verification failed at:", stage);
  throw error;
} finally {
  if (created) {
    await app.get(DataService).removeAll(id);
    await db.execute(
      "DELETE FROM face_app.face_auth_sessions WHERE user_id=:1",
      [id],
    );
    // OS-admin cleanup is limited to the exact synthetic account UUID+name created above.
    const sql = `whenever sqlerror exit sql.sqlcode
alter session set container=FREEPDB1;
DELETE FROM face_app.face_users WHERE id='${id}' AND username='${username}';
COMMIT;
exit
`;
    const result = spawnSync(
      "D:/Oracle/OracleApp/dbhomeFree/bin/sqlplus.exe",
      ["-L", "-S", "/ as sysdba"],
      {
        input: sql,
        encoding: "utf8",
        env: { ...process.env, NLS_LANG: "AMERICAN_AMERICA.AL32UTF8" },
      },
    );
    assert.equal(
      result.status,
      0,
      "Synthetic account cleanup failed; no unrelated account is targeted",
    );
  }
  await app.close();
  globalThis.fetch = originalFetch;
}
