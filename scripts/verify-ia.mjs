// CR-1.0-012: real Oracle/Nest HTTP integration with mock AI transport ONLY in this test process.
import "reflect-metadata";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { AppModule } from "../apps/api/dist/app.module.js";
import { OracleStore } from "../apps/api/dist/infrastructure/database.js";
import { setupApiDocs } from "../apps/api/dist/infrastructure/api-docs.js";
import { Errors } from "../apps/api/dist/infrastructure/http.js";
import { DataService } from "../apps/api/dist/modules/workspace/data.service.js";
import { hashPassword } from "../apps/api/dist/modules/auth/password.js";
import { config } from "../apps/api/dist/config.js";
import { dashboardSchema, reportSchema, dataExportSchema } from "@face/shared";
const sqlplus = process.env.FACE_SQLPLUS || "sqlplus";
assert.equal(
  spawnSync(sqlplus, ["-V"], { stdio: "ignore" }).status,
  0,
  "请将 SQL*Plus 加入 PATH，或设置 FACE_SQLPLUS 为本机 sqlplus.exe 的完整路径。",
);
const originalFetch = globalThis.fetch;
const replies = [];
let aiCalls = 0;
const realLocalModel = process.env.FACE_TEST_REAL_LOCAL_MODEL === "1";
let modelName = "合成候选人";
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
  if (String(input).startsWith("https://aip.baidubce.com/")) {
    return Response.json(
      String(input).includes("/oauth/")
        ? { access_token: "synthetic", expires_in: 600 }
        : { words_result: [{ words: "姓名：合成候选人" }] },
    );
  }
  if (String(input).startsWith("http://127.0.0.1:17861/")) {
    const request = JSON.parse(init.body);
    assert.equal(request.chat_template_kwargs.enable_thinking, false);
    if (request.messages[0].content === "调试样例提示词") {
      assert.equal(request.response_format.type, "json_schema");
      assert.equal(request.response_format.json_schema.strict, true);
      assert.equal(request.messages[1].content, "姓名：合成候选人");
      return Response.json({
        choices: [
          { finish_reason: "length", message: { content: '{"未完成":' } },
        ],
      });
    }
    if (modelName === "不在原文") {
      return Response.json({
        choices: [{ finish_reason: "stop", message: { content: "{}" } }],
      });
    }
    if (realLocalModel && modelName === "合成候选人")
      return originalFetch(input, init);
    return Response.json({
      choices: [
        {
          finish_reason: "stop",
          message: {
            content: JSON.stringify({
              基本信息: {
                姓名: modelName,
                性别: null,
                出生日期: null,
                电话: null,
                邮箱: null,
                微信号: null,
                现居: null,
                户籍: null,
                政治面貌: null,
                民族: null,
              },
              求职意向: {
                岗位: null,
                行业: null,
                城市: null,
                薪资: null,
                到岗时间: null,
                工作类型: null,
              },
              教育经历: [],
              "实习/工作经历": [],
              项目经历: [],
              校园经历: [],
              技能: [],
              自我评价: null,
              语言能力: [],
              爱好: [],
              其他: [],
            }),
          },
        },
      ],
    });
  }
  return originalFetch(input, init);
};
config.DEEPSEEK_API_KEY = randomUUID();
config.BAIDU_AK = randomUUID();
config.BAIDU_SK = randomUUID();
let app;
let base;
let db;
const id = randomUUID();
const username = "ia_" + id.slice(0, 8);
const password = randomUUID();
let cookie = "";
let created = false;
let stage = "initialization";
async function call(path, body, method = "GET") {
  const response = await originalFetch(base + path, {
    method,
    headers: {
      Cookie: cookie,
      ...(body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
    },
    body:
      body instanceof FormData || body === undefined
        ? body
        : JSON.stringify(body),
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
  app = await NestFactory.create(AppModule, {
    logger: false,
    abortOnError: false,
  });
  app.useBodyParser("json", { limit: "2mb" });
  app.use(cookieParser());
  app.useGlobalFilters(new Errors());
  setupApiDocs(app);
  await app.listen(0, "127.0.0.1");
  base = (await app.getUrl()) + "/api/v1";
  db = app.get(OracleStore);
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
  stage = "OCR import, OpenAPI and concurrent resume quota";
  const spec = await (
    await originalFetch((await app.getUrl()) + "/v3/api-docs")
  ).json();
  assert(spec.paths["/api/v1/resumes/{id}/structured"].put.requestBody);
  assert(spec.paths["/api/v1/auth/login"].post.requestBody);
  const png = new FormData();
  png.set(
    "file",
    new Blob([Buffer.from("89504e470d0a1a0a", "hex")]),
    "synthetic.png",
  );
  const debugRoot = (await app.getUrl()) + "/debug/resume";
  const debugOcr = await originalFetch(debugRoot + "/ocr", {
    method: "POST",
    headers: { Cookie: cookie },
    body: png,
  });
  assert.equal(debugOcr.status, 201);
  const { rawText } = await debugOcr.json();
  assert.equal(rawText, "姓名：合成候选人");
  const debugRun = await originalFetch(debugRoot + "/run", {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({
      rawText,
      prompt: "调试样例提示词",
    }),
  });
  assert.equal(debugRun.status, 201);
  const diagnostic = await debugRun.json();
  assert.equal(diagnostic.finishReason, "length");
  assert.equal(diagnostic.rawOutput, '{"未完成":');
  assert.equal(diagnostic.validJson, false);
  assert.equal((await originalFetch(debugRoot + "/prompt")).status, 401);
  modelName = "不在原文";
  const ocr = await call("/resumes", png, "POST");
  assert.equal(ocr.status, 201);
  assert.equal(ocr.body.rawText, "姓名：合成候选人");
  assert.equal(ocr.body.draft.error.code, "E_LOCAL_OUTPUT");
  const structuredPath = `/resumes/${ocr.body.id}/structured`;
  modelName = "合成候选人";
  const imported = await call(structuredPath + "/draft", undefined, "POST");
  assert.equal(imported.status, 201, imported.body.error?.code);
  assert.equal(imported.body.structured.基本信息.姓名, modelName);
  assert.equal((await call(structuredPath)).body.structured, null);
  const edited = {
    基本信息: {
      姓名: "人工更正",
      性别: "女",
      出生日期: "2000-01-02",
      电话: "000-000",
      邮箱: "synthetic@example.invalid",
      微信号: "synthetic",
      现居: "合成城市",
      户籍: "合成户籍",
      政治面貌: "合成政治面貌",
      民族: "合成民族",
    },
    求职意向: {
      岗位: "合成岗位",
      行业: "合成行业",
      城市: "合成城市",
      薪资: "面议",
      到岗时间: "随时到岗",
      工作类型: "全职",
    },
    教育经历: [
      {
        学校: "合成学校",
        学历: "本科",
        专业: "合成专业",
        开始: "2018",
        结束: "2022-06",
        学制: "4年制",
        学习形式: "全日制",
        排名: "5/120",
      },
    ],
    "实习/工作经历": [
      {
        公司名: " 合成公司 ",
        工作类型: "实习",
        部门: "合成部门",
        职位: "合成职位",
        开始: "2021年01月",
        结束: "至今",
        主要工作内容: Array.from({ length: 30 }, () =>
          "合成工作内容".repeat(200),
        ),
      },
    ],
    项目经历: [
      {
        项目名称: "合成项目",
        开始: "2020",
        结束: "2021",
        职责: ["合成职责"],
        成果: ["合成成果"],
      },
    ],
    校园经历: [
      { 组织名称: "合成组织", 职位: "合成职务", 主要工作内容: ["合成内容"] },
    ],
    技能: ["TypeScript"],
    自我评价: "合成自评",
    语言能力: [{ 语言: "英语", 等级: "合成等级" }],
    爱好: ["合成爱好"],
    其他: ["合成其他"],
  };
  const savedFields = await call(structuredPath, edited, "PUT");
  assert.equal(savedFields.status, 200, JSON.stringify(savedFields.body));
  assert.equal(savedFields.body.structured.基本信息.姓名, "人工更正");
  assert.deepEqual((await call(structuredPath)).body.structured, edited);
  assert.equal(
    (await call(structuredPath, { name: "invalid" }, "PUT")).status,
    400,
  );
  assert.equal(
    (await call(structuredPath, undefined, "DELETE")).body.structured,
    null,
  );
  const recognized = await call(
    `/resumes/${ocr.body.id}/recognize`,
    undefined,
    "POST",
  );
  assert.equal(recognized.status, 201);
  assert.deepEqual(recognized.body.draft, {
    ok: true,
    structured: imported.body.structured,
  });
  assert.equal((await call(structuredPath)).body.structured, null);
  const concurrent = await Promise.all(
    [1, 2].map((n) =>
      call(
        "/resumes/paste",
        { text: resumeText, filename: `synthetic-${n}.txt` },
        "POST",
      ),
    ),
  );
  assert.deepEqual(concurrent.map((item) => item.status).sort(), [201, 409]);
  assert.equal(
    concurrent.find((item) => item.status === 409).body.error.code,
    "E_RESUME_LIMIT",
  );
  for (const item of [
    ocr,
    concurrent.find((result) => result.status === 201),
  ]) {
    assert.equal(
      (
        await call(
          `/resumes/${item.body.id}`,
          { confirmation: "DELETE" },
          "DELETE",
        )
      ).status,
      200,
    );
  }
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
    `PASS: IA API with real Oracle: OpenAPI, OCR structured import/CRUD/retry, concurrent quota, preferences, truthful overview, paste/analysis, 5+5 anchored interview, progress, 10 scores, immutable reports/cache/staleness, privacy-safe diagnostics/export, skip, owner-scoped deletion. local inference ${realLocalModel ? "real on successful import" : "mocked"}; no real cloud request.`,
  );
} catch (error) {
  console.error("IA verification failed at:", stage);
  throw error;
} finally {
  try {
    if (created) {
      await app.get(DataService).removeAll(id);
      await db.execute(
        "DELETE FROM face_app.face_auth_sessions WHERE user_id=:1",
        [id],
      );
      // 管理员收尾仅清理本轮创建且UUID与账号名均匹配的合成账号。
      const sql = `whenever sqlerror exit sql.sqlcode
alter session set container=FREEPDB1;
DELETE FROM face_app.face_users WHERE id='${id}' AND username='${username}';
COMMIT;
exit
`;
      const result = spawnSync(sqlplus, ["-L", "-S", "/ as sysdba"], {
        input: sql,
        encoding: "utf8",
        env: { ...process.env, NLS_LANG: "AMERICAN_AMERICA.AL32UTF8" },
      });
      assert.equal(
        result.status,
        0,
        "Synthetic account cleanup failed; no unrelated account is targeted",
      );
    }
  } catch {
    console.error(
      "合成资料清理失败，请按本轮测试标识核对；未输出数据正文或凭证。",
    );
    process.exitCode = 1;
  } finally {
    try {
      if (app) await app.close();
    } catch {
      console.error("测试服务关闭失败，请核对本轮进程是否退出。");
      process.exitCode = 1;
    } finally {
      globalThis.fetch = originalFetch;
    }
  }
}
