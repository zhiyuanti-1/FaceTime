import { createHash } from "node:crypto";
import { describe, it, expect, vi } from "vitest";
vi.mock("../../apps/api/src/config.js", () => ({
  config: { LOCAL_RESUME_TIMEOUT_MS: 3000 },
}));
import { ResumeAiService } from "../../apps/api/src/modules/resume/service/resume-ai.service";
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

describe("模型 JSON 原值保留", () => {
  it("字段值、中文日期和数组内容完整保留", async () => {
    const { LocalResumeModel } =
      await import("../../apps/api/src/providers/local-resume-model.js");
    const fields = {
      基本信息: {
        姓名: null,
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
      "实习/工作经历": [
        {
          公司名: " 合成公司 ",
          工作类型: "实习",
          部门: null,
          职位: "开发",
          开始: "2026年08月",
          结束: "至今",
          主要工作内容: ["负责React开发与接口联调。", "把错误全部消除。"],
        },
      ],
      项目经历: [
        {
          项目名称: "合成项目",
          开始: null,
          结束: null,
          职责: ["负责React开发与接口联调。", "实现项目搜索。"],
          成果: [],
        },
      ],
      校园经历: [],
      技能: [],
      自我评价: null,
      语言能力: [],
      爱好: [],
      其他: [],
    };
    expect(
      createHash("sha256")
        .update(new LocalResumeModel().defaultPrompt)
        .digest("hex"),
    ).toBe("29017e41a47edaaa3e2a36d46ad26567253da3dafe36813dccafb8dccbae136e");
    const transport = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (_url, options) => {
        expect(JSON.parse(String(options?.body))).toMatchObject({
          model: "Qwen2.5-7B-Instruct",
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "resume",
              strict: true,
              schema: { type: "object", additionalProperties: false },
            },
          },
        });
        return Response.json({
          choices: [
            {
              finish_reason: "stop",
              message: { content: JSON.stringify(fields) },
            },
          ],
        });
      });
    try {
      const source =
        "合成公司 实习 开发 2026年08月—至今\n负责 React\n开发与接口联调。\n合成项目\n实现项目搜索。";
      const result = await new LocalResumeModel().extract(source);
      expect(result).toEqual(fields);
      const debug = await new LocalResumeModel().debug(source, "测试");
      expect(debug.structured).toEqual(fields);
    } finally {
      transport.mockRestore();
    }
  });
});
