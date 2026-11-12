import { afterEach, describe, expect, it, vi } from "vitest";
import { resumeFields } from "@face/shared";
import {
  missingWorkContent,
  prepareWorkText,
} from "../../apps/api/src/providers/resume-work-text.js";
vi.mock("../../apps/api/src/config.js", () => ({
  config: { LOCAL_RESUME_TIMEOUT_MS: 3000 },
}));
import { LocalResumeModel } from "../../apps/api/src/providers/local-resume-model.js";
import { ResumeParseService } from "../../apps/api/src/modules/resume/service/resume-parse.service.js";
import { DocumentExtractor } from "../../apps/api/src/providers/document-extractor.js";
import { BaiduOcr } from "../../apps/api/src/providers/baidu-ocr.js";

const source =
  "实习经历\r\n甲公司 开发实习 2025.01—2025.03\r\n职责：维护订单页面。\r\n项目成果：\r\n- 完成权限校验。\r\n- 减少重复请求。\r\n项目经历\r\n乙笔记\r\n项目成果：保留独立项目子标题。";
function fields(items: string[]) {
  return resumeFields.parse({
    基本信息: Object.fromEntries(
      [
        "姓名",
        "性别",
        "出生日期",
        "电话",
        "邮箱",
        "微信号",
        "现居",
        "户籍",
        "政治面貌",
        "民族",
      ].map((key) => [key, null]),
    ),
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
        公司名: "甲公司",
        工作类型: null,
        部门: null,
        职位: "开发实习",
        开始: "2025-01",
        结束: "2025-03",
        主要工作内容: items,
      },
    ],
    项目经历: [],
    校园经历: [],
    技能: [],
    自我评价: null,
    语言能力: [],
    爱好: [],
    其他: [],
  });
}
afterEach(() => vi.unstubAllGlobals());
describe("工作正文归属与覆盖", () => {
  it("去掉块内标签而保留正文、换行和独立项目", () => {
    const prepared = prepareWorkText(source);
    expect(prepared.removedHeadings).toBe(2);
    expect(prepared.text).toContain(
      "维护订单页面。\r\n\r\n- 完成权限校验。\r\n- 减少重复请求。",
    );
    expect(prepared.text).toContain("项目成果：保留独立项目子标题。");
    expect(
      source.slice(prepared.blocks[0]!.start, prepared.blocks[0]!.end),
    ).toContain("项目成果：");
    expect(missingWorkContent(prepared, fields(["维护订单页面。"]))).toBe(2);
    expect(
      missingWorkContent(
        prepared,
        fields(["维护订单页面。完成权限校验。减少重复请求。"]),
      ),
    ).toBe(0);
  });
  it.each([
    source.replace("实习经历\r\n", ""),
    source.replace("2025.01—2025.03", ""),
    "自我评价\n职责：愿意协作。",
  ])("缺少明确边界时不修改", (text) => {
    expect(prepareWorkText(text).text).toBe(text);
  });
  it("不删除正文中出现的子标题词，兼容空白与编号差异", () => {
    const prepared = prepareWorkText(
      "工作经历\n甲公司 2025年01月\n工作内容：负责项目成果展示。\n1. 完成 权限校验。",
    );
    expect(prepared.text).toContain("负责项目成果展示。");
    expect(
      missingWorkContent(
        prepared,
        fields(["负责项目成果展示。", "完成权限校验。"]),
      ),
    ).toBe(0);
  });
  it("公司之间不串正文，同名公司无法唯一匹配时不猜测", () => {
    const prepared = prepareWorkText(
      "工作经历\n甲公司 2024年\n职责：甲正文。\n乙公司 2025年\n职责：乙正文。\n个人总结\n愿意学习。",
    );
    expect(prepared.blocks.map((block) => block.body)).toEqual([
      ["甲正文。"],
      ["乙正文。"],
    ]);
    expect(missingWorkContent(prepared, fields(["甲正文。"]))).toBe(1);
    expect(
      missingWorkContent(
        prepareWorkText(prepared.text.replace("乙公司", "甲公司")),
        fields([]),
      ),
    ).toBe(0);
  });
  it("OCR 日期单独一行时识别相邻公司", () => {
    expect(
      prepareWorkText(
        "工作经历\n2025年01月\n甲公司\n开发实习\n职责：维护页面。",
      ).blocks[0]?.body,
    ).toEqual(["维护页面。"]);
  });
  it("第二家公司日期在前时，不把日期算入上一份工作正文", () => {
    const prepared = prepareWorkText(
      "工作经历\n甲公司 2024年\n职责：甲正文。\n2025年01月—2025年03月\n乙公司\n开发实习\n成果：乙正文。",
    );
    expect(prepared.blocks.map((block) => block.body)).toEqual([
      ["甲正文。"],
      ["乙正文。"],
    ]);
  });
  it("正文乱序也不能通过覆盖检查", () => {
    expect(
      missingWorkContent(
        prepareWorkText(source),
        fields(["完成权限校验。", "维护订单页面。", "减少重复请求。"]),
      ),
    ).toBe(1);
  });
  it("不将结构合法但正文遗漏的结果当作导入成功，并保留原文", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              finish_reason: "stop",
              message: {
                content: JSON.stringify(fields(["维护订单页面。"])),
              },
            },
          ],
        }),
      ),
    );
    vi.stubGlobal("fetch", fetcher);
    const service = new ResumeParseService(
      new DocumentExtractor(new BaiduOcr()),
      new LocalResumeModel(),
    );
    try {
      await service.parse({
        originalname: "合成简历.txt",
        buffer: Buffer.from(source),
      });
      expect.fail("应拒绝遗漏结果");
    } catch (error) {
      expect(error).toHaveProperty("code", "E_LOCAL_CONTENT_MISSING");
      if (
        !(error instanceof Error) ||
        !("getResponse" in error) ||
        typeof error.getResponse !== "function"
      )
        throw error;
      expect(error.getResponse()).toMatchObject({
        partial: { rawText: source },
        needsManualInput: true,
      });
    }
    expect(fetcher).toHaveBeenCalledTimes(1);
    const body: unknown = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
    expect(body).toMatchObject({
      messages: [
        expect.anything(),
        { role: "user", content: prepareWorkText(source).text },
      ],
    });
  });
});
