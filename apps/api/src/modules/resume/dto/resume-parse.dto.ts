import { z } from "zod";

export const resumeUpload = z.object({
  originalname: z.string().min(1),
  buffer: z.instanceof(Buffer),
}).readonly();

export type ResumeUpload = z.infer<typeof resumeUpload>;
export type { ResumeParseResponse } from "@face/shared";
