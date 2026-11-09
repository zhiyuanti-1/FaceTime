import { z } from "zod";
import { resumeFields } from "./resume-fields.js";

export const resumeId = z.uuid();
export const resumeSaveRequest = resumeFields.readonly();

export const resumeParseResponse = z.strictObject({ fields: resumeSaveRequest }).readonly();
export const resumeParseFailure = z.strictObject({
  ok: z.literal(false),
  code: z.string(),
  reason: z.enum(["document_unreadable", "model_failed"]),
  needsManualInput: z.literal(true),
  message: z.string(),
  partial: z.strictObject({ rawText: z.string() }).optional(),
}).readonly();

export type ResumeParseResponse = z.infer<typeof resumeParseResponse>;
export type ResumeParseFailure = z.infer<typeof resumeParseFailure>;

const resumeMetadata = z.strictObject({
  id: resumeId,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const resumeSummaryResponse = resumeMetadata.extend({
  fullName: z.string().nullable(),
  desiredRole: z.string().nullable(),
}).readonly();

export const resumeListResponse = z.array(resumeSummaryResponse).readonly();
export const resumeDetailResponse = resumeMetadata.extend({
  fields: resumeSaveRequest,
}).readonly();

export type ResumeSaveRequest = z.infer<typeof resumeSaveRequest>;
export type ResumeSummary = z.infer<typeof resumeSummaryResponse>;
export type ResumeDetail = z.infer<typeof resumeDetailResponse>;
