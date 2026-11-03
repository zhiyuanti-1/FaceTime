import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { PDFDocument } from "pdf-lib";
import { config } from "../config.js";
import { ApiError } from "../infrastructure/http.js";
const tokenResult = z.object({
  access_token: z.string(),
  expires_in: z.number().positive(),
});
const pageResult = z.object({
  words_result: z.array(z.object({ words: z.string() })),
  log_id: z.union([z.string(), z.number()]).optional(),
});
@Injectable()
export class BaiduOcr {
  private token: { value: string; until: number } | undefined;
  async readPdf(buffer: Buffer) {
    if (!config.BAIDU_AK || !config.BAIDU_SK)
      throw new ApiError(
        "E_OCR_CONFIG",
        "请先在apps/api/.env配置百度OCR的BAIDU_AK与BAIDU_SK，再重试识别",
      );
    let count: number;
    try {
      count = (await PDFDocument.load(buffer)).getPageCount();
    } catch {
      throw new ApiError(
        "E_PDF_INVALID",
        "PDF无法读取或已加密，请导出为未加密PDF后重试",
      );
    }
    if (count > config.PDF_MAX_PAGES)
      throw new ApiError(
        "E_PDF_PAGES",
        `PDF共有${count}页，超过当前${config.PDF_MAX_PAGES}页限制`,
      );
    const pages: { page: number; text: string }[] = [];
    const encoded = buffer.toString("base64");
    for (let page = 1; page <= count; page++) {
      const token = await this.accessToken();
      const body = new URLSearchParams({
        pdf_file: encoded,
        pdf_file_num: String(page),
        detect_direction: "true",
      });
      if (Buffer.byteLength(body.toString()) > 10 * 1024 * 1024)
        throw new ApiError(
          "E_OCR_SIZE",
          "PDF编码后超过百度10MB限制，请压缩文件",
        );
      const raw = await this.call(
        `https://aip.baidubce.com/rest/2.0/ocr/v1/${config.BAIDU_OCR_ENDPOINT}?access_token=${encodeURIComponent(token)}`,
        body,
      );
      const result = pageResult.safeParse(raw);
      if (!result.success)
        throw new ApiError(
          "E_OCR_UPSTREAM",
          "百度OCR未返回有效文字，请检查服务权限、额度后重试",
        );
      pages.push({
        page,
        text: result.data.words_result.map((word) => word.words).join("\n"),
      });
    }
    return pages;
  }
  async readImage(buffer: Buffer) {
    if (!config.BAIDU_AK || !config.BAIDU_SK)
      throw new ApiError("E_OCR_CONFIG", "请先配置百度OCR凭证");
    const body = new URLSearchParams({
      image: buffer.toString("base64"),
      detect_direction: "true",
    });
    if (Buffer.byteLength(body.toString()) > 4 * 1024 * 1024)
      throw new ApiError("E_OCR_SIZE", "图片编码超过百度4MB限制，请压缩后重试");
    const token = await this.accessToken();
    const result = pageResult.safeParse(
      await this.call(
        `https://aip.baidubce.com/rest/2.0/ocr/v1/${config.BAIDU_OCR_ENDPOINT}?access_token=${encodeURIComponent(token)}`,
        body,
      ),
    );
    if (!result.success)
      throw new ApiError("E_OCR_UPSTREAM", "百度OCR未返回有效文字");
    return [
      {
        page: 1,
        text: result.data.words_result.map((word) => word.words).join("\n"),
      },
    ];
  }
  private async accessToken() {
    if (this.token && this.token.until > Date.now()) return this.token.value;
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: config.BAIDU_AK,
      client_secret: config.BAIDU_SK,
    });
    const result = tokenResult.safeParse(
      await this.call("https://aip.baidubce.com/oauth/2.0/token", body),
    );
    if (!result.success)
      throw new ApiError("E_OCR_AUTH", "百度OCR鉴权失败，请检查本机AK/SK配置");
    this.token = {
      value: result.data.access_token,
      until: Date.now() + Math.max(0, result.data.expires_in - 60) * 1000,
    };
    return this.token.value;
  }
  private async call(url: string, body: URLSearchParams): Promise<unknown> {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) throw new Error("upstream");
      return (await response.json()) as unknown;
    } catch {
      throw new ApiError(
        "E_OCR_NETWORK",
        "百度OCR网络请求失败或超时，请稍后重试",
      );
    }
  }
}
