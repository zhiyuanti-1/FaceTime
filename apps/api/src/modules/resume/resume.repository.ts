import { Inject, Injectable } from "@nestjs/common";
import { z } from "zod";
import {
  resumeListSchema,
  resumeAnalysisSchema,
  type Resume,
} from "@face/shared";
import { OracleStore } from "../../infrastructure/database.js";
import { ApiError } from "../../infrastructure/http.js";
const row = z.object({
  ID: z.string(),
  ORIGINAL_FILENAME: z.string(),
  SOURCE_KIND: z.string(),
  EXTRACTION_STATUS: z.enum(["processing", "ready", "failed"]),
  RAW_TEXT: z.string().nullable(),
  EDITED_TEXT: z.string().nullable(),
  OCR_PAGES_JSON: z.string().nullable(),
  EXTRACTION_METHOD: z.string().nullable(),
  EXTRACTION_ERROR: z.string().nullable(),
  ORIGINAL_PATH: z.string(),
  CREATED_AT: z.date(),
  UPDATED_AT: z.date(),
  NEEDS_REVIEW: z.number(),
  PROFILE_JSON: z.string().nullable(),
});
const errors: Record<string, string> = {
  E_OCR_CONFIG: "百度OCR尚未配置，请填写后端.env后重启，再点击重新识别",
  E_OCR_AUTH: "百度凭证鉴权失败，请检查本机配置",
  E_OCR_NETWORK: "百度OCR连接失败或超时，可以重试",
  E_OCR_UPSTREAM: "百度OCR返回异常，请检查权限和额度",
  E_EMPTY_DOCUMENT: "未识别到文字，请检查文档或手动补充",
  E_PDF_INVALID: "PDF损坏或加密，请重新导出",
  E_PDF_PAGES: "PDF页数超过本机配置限制",
  E_OCR_SIZE: "文档编码超过OCR大小限制",
  E_DOCUMENT_PARSE: "文档提取失败，请更换格式",
};
@Injectable()
export class ResumeRepository {
  constructor(@Inject(OracleStore) private readonly db: OracleStore) {}
  async list(owner: string) {
    const rows = await this.db.rows(
      "SELECT * FROM face_app.face_resumes WHERE owner_id=:1 AND delete_requested_at IS NULL ORDER BY created_at DESC",
      [owner],
      row,
    );
    return resumeListSchema.parse(rows.map((value) => this.dto(value)));
  }
  async get(owner: string, id: string) {
    const rows = await this.db.rows(
      "SELECT * FROM face_app.face_resumes WHERE owner_id=:1 AND id=:2 AND delete_requested_at IS NULL",
      [owner, id],
      row,
    );
    const value = rows[0];
    if (!value) throw new ApiError("E_NOT_FOUND", "未找到这份简历", 404);
    return value;
  }
  dto(value: z.infer<typeof row>): Resume {
    return {
      id: value.ID,
      filename: value.ORIGINAL_FILENAME,
      source: value.SOURCE_KIND,
      status: value.EXTRACTION_STATUS,
      rawText: value.RAW_TEXT ?? "",
      editedText: value.EDITED_TEXT,
      pages: z
        .array(z.object({ page: z.number(), text: z.string() }))
        .parse(JSON.parse(value.OCR_PAGES_JSON ?? "[]") as unknown),
      method: value.EXTRACTION_METHOD,
      error: value.EXTRACTION_ERROR
        ? (errors[value.EXTRACTION_ERROR] ?? "文字提取未完成，请重试")
        : null,
      createdAt: value.CREATED_AT.toISOString(),
      updatedAt: value.UPDATED_AT.toISOString(),
      needsReview: value.NEEDS_REVIEW === 1,
      analysis: value.PROFILE_JSON
        ? resumeAnalysisSchema.parse(JSON.parse(value.PROFILE_JSON) as unknown)
        : null,
    };
  }
  async insert(
    owner: string,
    id: string,
    name: string,
    source: string,
    path: string,
    size = 0,
  ) {
    await this.db.execute(
      "INSERT INTO face_app.face_resumes(id,owner_id,source_kind,original_filename,original_path,file_size_bytes,extraction_status) VALUES(:1,:2,:3,:4,:5,:6,'processing')",
      [id, owner, source, name, path, size],
    );
  }
  async extracting(owner: string, id: string) {
    await this.db.execute(
      "UPDATE face_app.face_resumes SET extraction_status='processing',extraction_error=NULL,updated_at=SYSTIMESTAMP WHERE owner_id=:1 AND id=:2",
      [owner, id],
    );
  }
  async extracted(
    owner: string,
    id: string,
    result: {
      rawText: string;
      pages: { page: number; text: string }[];
      method: string;
    },
  ) {
    await this.db.execute(
      "UPDATE face_app.face_resumes SET raw_text=:1,ocr_pages_json=:2,extraction_method=:3,extraction_status='ready',extraction_error=NULL,needs_review=1,updated_at=SYSTIMESTAMP WHERE owner_id=:4 AND id=:5",
      [result.rawText, JSON.stringify(result.pages), result.method, owner, id],
    );
  }
  async failed(owner: string, id: string, code: string) {
    await this.db.execute(
      "UPDATE face_app.face_resumes SET extraction_status='failed',extraction_error=:1,updated_at=SYSTIMESTAMP WHERE owner_id=:2 AND id=:3",
      [code, owner, id],
    );
  }
  async confirm(owner: string, id: string, text: string) {
    await this.get(owner, id);
    await this.db.execute(
      "UPDATE face_app.face_resumes SET edited_text=:1,profile_json=NULL,needs_review=0,updated_at=SYSTIMESTAMP WHERE owner_id=:2 AND id=:3",
      [text, owner, id],
    );
    return this.dto(await this.get(owner, id));
  }
}
