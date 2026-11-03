import { describe, it, expect, vi } from "vitest";
vi.mock("../../apps/api/src/config.js", () => ({ config: {} }));
import { ResumeAiService } from "../../apps/api/src/modules/resume/resume-ai.service";
import { resumeAnalysisSchema, aiScoreSchema } from "@face/shared";
describe("resume and AI evidence boundary", () => {
  const profile = resumeAnalysisSchema.parse({
    summary: "测试",
    name: null,
    targetRole: null,
    projects: [
      { name: "项目", quote: "负责React项目", questions: ["如何测试？"] },
    ],
    suspicions: [],
  });
  it("accepts only verbatim resume quotes", () => {
    expect(() =>
      ResumeAiService.prototype.validate(profile, "负责React项目"),
    ).not.toThrow();
    expect(() =>
      ResumeAiService.prototype.validate(profile, "没有这段经历"),
    ).toThrow("引用");
  });
  it("does not accept a fabricated name or target role", () => {
    expect(() =>
      ResumeAiService.prototype.validate(
        { ...profile, name: "虚构姓名" },
        "负责React项目",
      ),
    ).toThrow("基本信息");
  });
  it("requires bases, rather than accepting an unexplained score", () => {
    expect(
      aiScoreSchema.safeParse({
        status: "scored",
        confidence: 1,
        scores: { content: 40 },
      }).success,
    ).toBe(false);
  });
});
