import type { ResumeParseFailure, ResumeParseResponse } from "@face/shared";
import { Inject, Injectable } from "@nestjs/common";
import { ApiError } from "../../../infrastructure/http.js";
import { DocumentExtractor } from "../../../providers/document-extractor.js";
import { LocalResumeModel } from "../../../providers/local-resume-model.js";
import type { ResumeUpload } from "../dto/resume-parse.dto.js";

class ResumeParseError extends ApiError {
  constructor(private readonly failure: ResumeParseFailure, status: number) {
    super(failure.code, failure.message, status);
  }

  override getResponse(): ResumeParseFailure {
    return this.failure;
  }
}

@Injectable()
export class ResumeParseService {
  constructor(
    @Inject(DocumentExtractor) private readonly documents: DocumentExtractor,
    @Inject(LocalResumeModel) private readonly model: LocalResumeModel,
  ) {}

  async parse(file: ResumeUpload): Promise<ResumeParseResponse> {
    let rawText: string | undefined;
    try {
      const format = this.documents.validate(file.originalname, file.buffer);
      if (format === "image") {
        throw new ApiError("E_FILE_TYPE", "请选择 PDF、DOCX、DOC 或 UTF-8 TXT 简历");
      }
      ({ rawText } = await this.documents.extract(format, file.buffer));
      return { fields: await this.model.extract(rawText) };
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      throw new ResumeParseError({
        ok: false,
        code: error.code,
        reason: rawText === undefined ? "document_unreadable" : "model_failed",
        needsManualInput: true,
        message: error.message,
        partial: rawText === undefined ? undefined : { rawText },
      }, error.getStatus());
    }
  }
}
