import { z } from "zod";

export const resumeDebugRequest = z.strictObject({
  rawText: z.string().max(200000).refine((value) => value.trim().length > 0, "请先获取 OCR 原文"),
  prompt: z.string().trim().min(1).max(20000),
}).readonly();

export type ResumeDebugRequest = z.infer<typeof resumeDebugRequest>;
