import { Inject, Injectable } from "@nestjs/common";
import { ApiError } from "../../../infrastructure/http.js";
import { DocumentExtractor } from "../../../providers/document-extractor.js";
import { LocalResumeModel } from "../../../providers/local-resume-model.js";
import type { ResumeDebugRequest } from "../dto/resume-debug.dto.js";

@Injectable()
export class ResumeDebugService {
  constructor(
    @Inject(DocumentExtractor) private readonly extractor: DocumentExtractor,
    @Inject(LocalResumeModel) private readonly model: LocalResumeModel,
  ) {}

  getPrompt() {
    return { prompt: this.model.defaultPrompt };
  }

  extractDocument(file?: Readonly<{ originalname: string; buffer: Buffer }>) {
    if (!file) throw new ApiError("E_FILE_MISSING", "请选择 PDF 或图片");
    const source = this.extractor.validate(file.originalname, file.buffer);
    if (source !== "image" && source !== "pdf")
      throw new ApiError("E_FILE_TYPE", "调试 OCR 只支持 PDF、PNG 和 JPEG");
    return this.extractor.extract(source, file.buffer);
  }

  run(request: ResumeDebugRequest) {
    return this.model.debug(request.rawText, request.prompt);
  }
}
