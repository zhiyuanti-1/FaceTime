import { z } from "zod";
import { LocalResumeModel } from "../../providers/local-resume-model.js";
import { Readable } from "node:stream";
import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { DocumentExtractor } from "../../providers/document-extractor.js";
import { ResumeRepository } from "./resume.repository.js";
import { dataRoot } from "../../config.js";
import { ApiError } from "../../infrastructure/http.js";
const inputError = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});
@Injectable()
export class ResumeService {
  private readonly running = new Set<string>();
  constructor(
    @Inject(ResumeRepository) private readonly repo: ResumeRepository,
    @Inject(DocumentExtractor) private readonly extractor: DocumentExtractor,
    @Inject(LocalResumeModel) private readonly model: LocalResumeModel,
  ) {}
  setDefault(owner: string, id: string) {
    return this.repo.setDefault(owner, id);
  }
  path(relative: string) {
    const path = resolve(dataRoot, relative);
    if (!path.startsWith(dataRoot + sep))
      throw new ApiError("E_FILE_PATH", "文件路径无效", 500);
    return path;
  }
  async upload(owner: string, file: Express.Multer.File) {
    let filename = file.originalname;
    if (!/[^\u0000-\u00ff]/.test(filename)) {
      const decoded = Buffer.from(filename, "latin1").toString("utf8");
      if (!decoded.includes("�")) filename = decoded;
    }
    const source = this.extractor.validate(filename, file.buffer);
    const id = randomUUID();
    const relative = `resumes/${owner}/${id}.${source}`;
    const path = this.path(relative);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, file.buffer);
    try {
      await this.repo.insert(
        owner,
        id,
        filename.slice(0, 255),
        source,
        relative,
        file.size,
      );
    } catch (error) {
      await unlink(path);
      throw error;
    }
    return this.recognize(owner, id, file.buffer);
  }
  async draftStructure(owner: string, id: string) {
    const resume = await this.repo.get(owner, id);
    if (resume.EXTRACTION_STATUS !== "ready" || !resume.RAW_TEXT)
      throw new ApiError("E_OCR_REQUIRED", "请先完成简历文字识别", 409);
    return { structured: await this.model.extract(resume.RAW_TEXT) };
  }

  async withDraft(
    owner: string,
    resume: Awaited<ReturnType<ResumeService["recognize"]>>,
  ) {
    if (resume.status !== "ready") return { ...resume, draft: null };
    try {
      return {
        ...resume,
        draft: { ok: true, ...(await this.draftStructure(owner, resume.id)) },
      };
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      return {
        ...resume,
        draft: { ok: false, ...inputError.parse(error.getResponse()) },
      };
    }
  }
  async paste(owner: string, text: string, filename: string) {
    const buffer = Buffer.from(text, "utf8");
    const resume = await this.upload(owner, {
      originalname: filename.endsWith(".txt") ? filename : filename + ".txt",
      buffer,
      size: buffer.length,
      mimetype: "text/plain",
      fieldname: "file",
      encoding: "7bit",
      stream: Readable.from(buffer),
      destination: "",
      filename: "",
      path: "",
    });
    return this.repo.confirm(owner, resume.id, text);
  }
  async recognize(owner: string, id: string, provided?: Buffer) {
    const value = await this.repo.get(owner, id);
    if (this.running.has(id))
      throw new ApiError("E_BUSY", "这份简历正在识别，请稍后刷新", 409);
    this.running.add(id);
    try {
      await this.repo.extracting(owner, id);
      const buffer =
        provided ?? (await readFile(this.path(value.ORIGINAL_PATH)));
      await this.repo.extracted(
        owner,
        id,
        await this.extractor.extract(value.SOURCE_KIND, buffer),
      );
    } catch (error) {
      const code =
        error instanceof ApiError
          ? String(
              (error.getResponse() as { error: { code: string } }).error.code,
            )
          : "E_DOCUMENT_PARSE";
      await this.repo.failed(owner, id, code);
    } finally {
      this.running.delete(id);
    }
    return this.repo.dto(await this.repo.get(owner, id));
  }
}
