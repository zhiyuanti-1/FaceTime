import { z } from "zod";
export const userSchema = z.object({ id: z.string(), username: z.string() });
export type User = z.infer<typeof userSchema>;
import { resumeAnalysisSchema } from "./ai.js";
export const resumeSchema = z.object({
  id: z.string(),
  filename: z.string(),
  source: z.string(),
  status: z.enum(["processing", "ready", "failed"]),
  rawText: z.string(),
  editedText: z.string().nullable(),
  pages: z.array(z.object({ page: z.number(), text: z.string() })),
  method: z.string().nullable(),
  error: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  needsReview: z.boolean().default(true),
  analysis: resumeAnalysisSchema.nullable().default(null),
});
export type Resume = z.infer<typeof resumeSchema>;
export const resumeListSchema = z.array(
  resumeSchema.omit({
    rawText: true,
    editedText: true,
    pages: true,
    analysis: true,
  }),
);
export type ResumeSummary = z.infer<typeof resumeListSchema>[number];
export const topicSchema = z.object({
  id: z.string(),
  name: z.string(),
  count: z.number(),
  stage: z.string(),
});
export const topicsSchema = z.array(topicSchema);
export type Topic = z.infer<typeof topicSchema>;
export const publicQuestionSchema = z.object({
  id: z.string(),
  text: z.string(),
  topicId: z.string(),
  topicName: z.string(),
  difficulty: z.number(),
  stage: z.string(),
  kind: z.enum(["knowledge", "resume", "general"]).default("knowledge"),
  anchorQuote: z.string().nullable().default(null),
  source: z.enum(["suspicion", "project", "gap_fill"]).nullable().default(null),
  confidence: z.number().min(0).max(1).nullable().default(null),
});
export const turnSchema = z.object({
  id: z.string(),
  index: z.number(),
  question: publicQuestionSchema,
  answerText: z.string(),
  status: z.string(),
  answerRevision: z.number().default(0),
});
export type Turn = z.infer<typeof turnSchema>;
export const practiceSchema = z.object({
  id: z.string(),
  status: z.string(),
  resumeId: z.string().nullable(),
  weights: z.record(z.string(), z.number()),
  mode: z.enum(["knowledge", "interview"]).default("knowledge"),
  jobTitle: z.string().default(""),
  order: z.enum(["alternate", "knowledge_first"]).default("alternate"),
  currentIndex: z.number().default(0),
  resumeQuestionCount: z.number().default(0),
  turns: z.array(turnSchema),
  warnings: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Practice = z.infer<typeof practiceSchema>;
export const historySchema = z.array(
  z.object({
    id: z.string(),
    status: z.string(),
    jobTitle: z.string().default(""),
    mode: z.enum(["knowledge", "interview"]).default("knowledge"),
    currentIndex: z.number().default(0),
    skipped: z.number().default(0),
    latestReport: z
      .object({
        id: z.string(),
        revision: z.number(),
        scoreKind: z.enum(["point", "interval"]).nullable(),
        totalScore: z.number().nullable(),
        totalScoreRange: z.tuple([z.number(), z.number()]).nullable(),
        stale: z.boolean(),
      })
      .nullable()
      .default(null),
    count: z.number(),
    answered: z.number(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
);
export type PracticeHistory = z.infer<typeof historySchema>;
export const settingsSchema = z.object({
  baiduConfigured: z.boolean(),
  ocrEndpoint: z.string(),
  uploadMaxMb: z.number(),
  pdfMaxPages: z.number(),
  database: z.literal("Oracle"),
  scoringEnabled: z.boolean(),
});
export const loginInput = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(256),
});
export const createPracticeInput = z.object({
  weights: z.record(z.string(), z.number().min(0).max(100)),
  mode: z.enum(["knowledge", "interview"]).default("knowledge"),
  jobTitle: z.string().trim().max(100).default(""),
  order: z.enum(["alternate", "knowledge_first"]).default("alternate"),
  count: z.number().int().min(1).max(20).default(5),
  resumeId: z.string().max(36).nullable().default(null),
});
export type CreatePractice = Omit<
  z.output<typeof createPracticeInput>,
  "mode" | "jobTitle" | "order"
> &
  Partial<
    Pick<z.output<typeof createPracticeInput>, "mode" | "jobTitle" | "order">
  >;
export const answerInput = z.object({
  text: z.string().trim().min(1, "请先输入回答").max(20000),
});
export const confirmResumeInput = z.object({
  text: z.string().trim().min(1, "内容不能为空").max(200000),
});
