import { createPracticeInput, quotaInput } from "@face/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";
import { allocateQuestions } from "../../apps/api/src/modules/practice/allocation";
import {
  hashPassword,
  verifyPassword,
} from "../../apps/api/src/modules/auth/password";
vi.mock("../../apps/api/src/config.js", () => ({
  config: {
    BAIDU_AK: "mock-ak",
    BAIDU_SK: "mock-sk",
    BAIDU_OCR_ENDPOINT: "accurate_basic",
    PDF_MAX_PAGES: 10,
  },
}));
import { BaiduOcr } from "../../apps/api/src/providers/baidu-ocr";
import { DocumentExtractor } from "../../apps/api/src/providers/document-extractor";
afterEach(() => vi.unstubAllGlobals());
describe("question quotas", () => {
  it("uses relative weights with a stable total", () => {
    expect(quotaInput.parse({ weights: { js: 1 } }).mode).toBe(
      createPracticeInput.parse({ weights: { js: 1 } }).mode,
    );
    expect(
      allocateQuestions(5, [
        { id: "a", weight: 3, available: 20 },
        { id: "b", weight: 2, available: 20 },
      ]),
    ).toEqual([
      { id: "a", count: 3 },
      { id: "b", count: 2 },
    ]);
  });
  it("redistributes capped topics and excludes zero weight", () => {
    expect(
      allocateQuestions(5, [
        { id: "a", weight: 100, available: 1 },
        { id: "b", weight: 1, available: 20 },
        { id: "c", weight: 0, available: 20 },
      ]),
    ).toEqual([
      { id: "a", count: 1 },
      { id: "b", count: 4 },
    ]);
  });
  it("rejects insufficient capacity", () =>
    expect(() =>
      allocateQuestions(5, [{ id: "a", weight: 1, available: 2 }]),
    ).toThrow("题量不足"));
});
describe("password storage", () => {
  it("salts hashes and rejects incorrect passwords", () => {
    const value = "synthetic-test-password";
    const first = hashPassword(value);
    expect(first).not.toContain(value);
    expect(first).not.toEqual(hashPassword(value));
    expect(verifyPassword(value, first)).toBe(true);
    expect(verifyPassword("wrong", first)).toBe(false);
    expect(verifyPassword(value, "invalid")).toBe(false);
  });
});
describe("Baidu contract (mock transport only)", () => {
  it("requests every PDF page, reuses token and preserves returned lines", async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage();
    pdf.addPage();
    const transport = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: "mock-token", expires_in: 3600 }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            words_result: [{ words: "第一页" }, { words: " 空格保留 " }],
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ words_result: [{ words: "第二页" }] })),
      );
    vi.stubGlobal("fetch", transport);
    expect(await new BaiduOcr().readPdf(Buffer.from(await pdf.save()))).toEqual(
      [
        { page: 1, text: "第一页\n 空格保留 " },
        { page: 2, text: "第二页" },
      ],
    );
    expect(transport).toHaveBeenCalledTimes(3);
    expect(String(transport.mock.calls[2]?.[1]?.body)).toContain(
      "pdf_file_num=2",
    );
  });
  it("rejects an upstream error instead of inventing text", async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ access_token: "mock-token", expires_in: 3600 }),
          ),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error_code: 17, error_msg: "quota" })),
        ),
    );
    await expect(
      new BaiduOcr().readPdf(Buffer.from(await pdf.save())),
    ).rejects.toThrow("未返回有效文字");
  });
  it("rejects page overflow before making requests", async () => {
    const pdf = await PDFDocument.create();
    for (let i = 0; i < 11; i++) pdf.addPage();
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(
      new BaiduOcr().readPdf(Buffer.from(await pdf.save())),
    ).rejects.toThrow("超过");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("uses image form encoding for PNG/JPEG OCR", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: "mock-token", expires_in: 3600 }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ words_result: [{ words: "图片文字" }] })),
      );
    vi.stubGlobal("fetch", fetcher);
    expect(
      await new BaiduOcr().readImage(Buffer.from("synthetic-image")),
    ).toEqual([{ page: 1, text: "图片文字" }]);
    expect(String(fetcher.mock.calls[1]?.[1]?.body)).toContain("image=");
    expect(String(fetcher.mock.calls[1]?.[1]?.body)).not.toContain("pdf_file=");
  });
  it("extracts UTF-8 exactly and rejects unsupported file types", async () => {
    const extractor = new DocumentExtractor(new BaiduOcr());
    const raw = "姓名：测试用户\n 技能：TypeScript \n";
    expect((await extractor.extract("txt", Buffer.from(raw))).rawText).toBe(
      raw,
    );
    expect(() => extractor.validate("photo.bmp", Buffer.from("test"))).toThrow(
      "仅支持",
    );
    expect(() => extractor.validate("fake.pdf", Buffer.from("text"))).toThrow(
      "不符",
    );
  });
});
