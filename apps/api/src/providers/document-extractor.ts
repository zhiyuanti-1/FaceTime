import { Inject, Injectable } from "@nestjs/common";
import { extname } from "node:path";
import mammoth from "mammoth";
import WordExtractor from "word-extractor";
import { BaiduOcr } from "./baidu-ocr.js";
import { ApiError } from "../infrastructure/http.js";
@Injectable()
export class DocumentExtractor {
  constructor(@Inject(BaiduOcr) private readonly ocr: BaiduOcr) {}
  validate(filename: string, buffer: Buffer) {
    const extension = extname(filename).toLowerCase().slice(1);
    if (!["pdf", "docx", "doc", "txt"].includes(extension))
      throw new ApiError(
        "E_FILE_TYPE",
        "仅支持PDF、Word（DOC/DOCX）或UTF-8 TXT文字文件",
      );
    if (
      (extension === "pdf" &&
        !buffer.subarray(0, 5).equals(Buffer.from("%PDF-"))) ||
      (extension === "docx" && buffer.subarray(0, 2).toString() !== "PK") ||
      (extension === "doc" &&
        !buffer.subarray(0, 4).equals(Buffer.from([208, 207, 17, 224])))
    )
      throw new ApiError(
        "E_FILE_FORMAT",
        "文件内容与扩展名不符，请使用原始文档",
      );
    return extension;
  }
  async extract(extension: string, buffer: Buffer) {
    if (extension === "pdf") {
      const pages = await this.ocr.readPdf(buffer);
      const rawText = pages.map((p) => p.text).join("\n\n");
      if (!rawText.trim())
        throw new ApiError(
          "E_EMPTY_DOCUMENT",
          "OCR没有识别到文字，请检查文档是否清晰",
        );
      return { rawText, pages, method: "baidu-" + extension };
    }
    let rawText: string;
    try {
      if (extension === "docx")
        rawText = (await mammoth.extractRawText({ buffer })).value;
      else if (extension === "doc")
        rawText = (await new WordExtractor().extract(buffer)).getBody();
      else rawText = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    } catch {
      throw new ApiError(
        "E_DOCUMENT_PARSE",
        "文档文字提取失败，请另存为DOCX、PDF或UTF-8 TXT后重试",
      );
    }
    if (!rawText.trim())
      throw new ApiError(
        "E_EMPTY_DOCUMENT",
        "未提取到文字；扫描文档请转成PDF并使用百度OCR",
      );
    return {
      rawText,
      pages: [{ page: 1, text: rawText }],
      method: "text-" + extension,
    };
  }
}
