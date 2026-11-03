import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  aiScoreSchema,
  applySessionBonusCaps,
  evaluateAnswer,
  scoringRulesSchema,
} from "@face/shared";
const rules = scoringRulesSchema.parse(
  JSON.parse(
    readFileSync("packages/rules/scoring/1.0.0.json", "utf8"),
  ) as unknown,
);
const context = {
  answer: "这是足够长的合成测试回答，我说明了具体的方案、实现步骤和测试结果。",
  resume: "负责React项目",
  kind: "knowledge",
  answerRevision: 1,
};
function model() {
  return aiScoreSchema.parse({
    status: "scored",
    confidence: 0.9,
    bases: { content: 32, resume: null, fit: 8 },
    scores: { content: 32, resume: null, fit: 8, filler: null, body: null },
    deductions: [],
    bonuses: [],
    followUp: null,
    resumeFlags: [],
    improvements: [],
    needsReview: false,
  });
}
describe("evidence-aware scoring engine", () => {
  it("normalizes only scored dimensions, with no fake voice/body scores", () => {
    const result = evaluateAnswer(model(), context, rules);
    expect(result.totalScore).toBe(80);
    expect(result.coverage).toBeCloseTo(50 / 90);
    expect(result.dimensions.find((d) => d.code === "BODY")?.status).toBe(
      "NOT_ENABLED",
    );
    expect(result.dimensions.find((d) => d.code === "FLUENCY")?.raw).toBeNull();
    expect(result.dimensions.find((d) => d.code === "RESUME")?.status).toBe(
      "NOT_APPLICABLE",
    );
  });
  it("does not silently accept fabricated evidence", () => {
    const ai = model();
    ai.deductions = [
      {
        ruleId: "CNT-002",
        dimension: "CONTENT",
        points: 8,
        evidence: "不存在的回答",
        resumeQuote: null,
        confidence: 0.9,
      },
    ];
    const result = evaluateAnswer(ai, context, rules);
    expect(result.deductions[0]?.status).toBe("PENDING_REVIEW");
    expect(result.dimensions.find((d) => d.code === "CONTENT")?.status).toBe(
      "NEEDS_REVIEW",
    );
    expect(result.totalScore).toBeNull();
  });
  it("checks base minus deductions equals raw score", () => {
    const ai = model();
    ai.bases.content = 40;
    const result = evaluateAnswer(ai, context, rules);
    expect(result.reviewLog.join()).toContain("等式");
    expect(result.dimensions.find((d) => d.code === "CONTENT")?.raw).toBeNull();
  });
  it("never applies low-confidence deductions", () => {
    const ai = model();
    ai.bases.content = 40;
    ai.deductions = [
      {
        ruleId: "CNT-002",
        dimension: "CONTENT",
        points: 8,
        evidence: "合成测试回答",
        resumeQuote: null,
        confidence: 0.4,
      },
    ];
    expect(evaluateAnswer(ai, context, rules).deductions[0]?.status).toBe(
      "PENDING_REVIEW",
    );
  });
  it("requires a resume quote for contradiction rules", () => {
    const ai = model();
    ai.bases.resume = 15;
    ai.scores.resume = 7.5;
    ai.deductions = [
      {
        ruleId: "RES-002",
        dimension: "RESUME",
        points: 12,
        evidence: "合成测试回答",
        resumeQuote: null,
        confidence: 0.9,
      },
    ];
    const result = evaluateAnswer(ai, { ...context, kind: "resume" }, rules);
    expect(result.deductions[0]?.status).toBe("PENDING_REVIEW");
  });
  it("caps a valid dimension deduction at 50%", () => {
    const ai = model();
    ai.bases.resume = 15;
    ai.scores.resume = 7.5;
    ai.deductions = [
      {
        ruleId: "RES-002",
        dimension: "RESUME",
        points: 12,
        evidence: "合成测试回答",
        resumeQuote: "负责React项目",
        confidence: 0.9,
      },
    ];
    const result = evaluateAnswer(ai, { ...context, kind: "resume" }, rules);
    expect(result.deductions[0]?.points).toBe(7.5);
    expect(result.deductions[0]?.status).toBe("APPLIED");
  });
  it("forces short answers to an interval", () => {
    const result = evaluateAnswer(
      model(),
      { ...context, answer: "简短回答" },
      rules,
    );
    expect(result.scoreKind).toBe("interval");
    expect(result.totalScore).toBeNull();
  });
  it("returns no fabricated score when every dimension is unavailable", () => {
    const ai = model();
    ai.needsReview = true;
    const result = evaluateAnswer(ai, context, rules);
    expect(result.scoreKind).toBeNull();
    expect(result.totalScore).toBeNull();
    expect(result.coverage).toBe(0);
  });
  it("rejects unknown JSON keys and negative event points", () => {
    expect(
      aiScoreSchema.safeParse({ ...model(), unexpected: true }).success,
    ).toBe(false);
    const ai = model();
    expect(
      aiScoreSchema.safeParse({
        ...ai,
        deductions: [
          {
            ruleId: "CNT-001",
            dimension: "CONTENT",
            points: -1,
            evidence: "x",
            resumeQuote: null,
            confidence: 1,
          },
        ],
      }).success,
    ).toBe(false);
  });
  it("caps STAR bonuses across the whole report without mutating source scores", () => {
    const ai = model();
    ai.bases.content = 30;
    ai.scores.content = 32;
    ai.bonuses = [
      {
        ruleId: "BON-001",
        dimension: "CONTENT",
        points: 2,
        evidence: "合成测试回答",
        resumeQuote: null,
        confidence: 0.9,
      },
    ];
    const score = evaluateAnswer(ai, context, rules);
    const result = applySessionBonusCaps(
      Array.from({ length: 5 }, () => ({ score, bases: ai.bases })),
      rules,
    );
    expect(
      result
        .flatMap((s) => s.bonuses)
        .filter((e) => e.status === "APPLIED")
        .reduce((sum, e) => sum + e.points, 0),
    ).toBe(6);
    expect(score.bonuses[0]?.status).toBe("APPLIED");
    expect(result[4]?.bonuses[0]?.status).toBe("WAIVED");
  });
});
