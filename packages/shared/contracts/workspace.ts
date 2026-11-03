import { resumeSchema, practiceSchema } from "./base.js";
import { z } from "zod";
export const preferencesSchema = z
  .object({
    jobTitle: z.string().trim().max(100).default(""),
    order: z.enum(["alternate", "knowledge_first"]).default("alternate"),
    weights: z.record(z.string(), z.number().min(0).max(100)).default({}),
    defaultResumeId: z.string().max(36).nullable().default(null),
  })
  .strict();
export type Preferences = z.infer<typeof preferencesSchema>;
export const pasteResumeInput = z
  .object({
    text: z
      .string()
      .min(1)
      .max(200000)
      .refine((value) => !!value.trim(), "内容不能为空"),
    filename: z.string().trim().min(1).max(255).default("粘贴简历.txt"),
  })
  .strict();
export const navigateInput = z
  .object({ index: z.number().int().min(0).max(19) })
  .strict();
export const deleteConfirmation = z
  .object({ confirmation: z.literal("DELETE") })
  .strict();
export const quotaInput = z
  .object({
    weights: z.record(z.string(), z.number().min(0).max(100)),
    count: z.number().int().min(1).max(20).default(5),
    mode: z.enum(["knowledge", "interview"]).default("knowledge"),
  })
  .strict();
export const dimensionSchema = z.object({
  code: z.enum(["CONTENT", "RESUME", "FIT", "FLUENCY", "FILLER", "BODY"]),
  rawMax: z.number(),
  raw: z.number().nullable(),
  weight: z.number(),
  score: z.number().nullable(),
  status: z.enum(["SCORED", "NEEDS_REVIEW", "NOT_APPLICABLE", "NOT_ENABLED"]),
});
export const scoreEventSchema = z.object({
  turnId: z.string().optional(),
  ruleId: z.string(),
  dimension: z.string(),
  points: z.number().positive(),
  evidence: z.string(),
  resumeQuote: z.string().nullable(),
  confidence: z.number().nullable(),
  status: z.enum(["APPLIED", "PENDING_REVIEW", "INCONCLUSIVE", "WAIVED"]),
});
export const turnScoreSchema = z.object({
  scoringVersion: z.string(),
  promptVersion: z.string(),
  answerRevision: z.number(),
  confidence: z.number(),
  scoreKind: z.enum(["point", "interval"]).nullable(),
  totalScore: z.number().nullable(),
  totalScoreRange: z.tuple([z.number(), z.number()]).nullable(),
  coverage: z.number(),
  dimensions: z.array(dimensionSchema),
  deductions: z.array(scoreEventSchema),
  bonuses: z.array(scoreEventSchema),
  needsReview: z.boolean(),
  reviewLog: z.array(z.string()),
  improvements: z.array(z.string()),
});
export type TurnScore = z.infer<typeof turnScoreSchema>;
export const reportSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  revision: z.number(),
  createdAt: z.string(),
  stale: z.boolean(),
  scoringVersion: z.string(),
  promptVersion: z.string(),
  bankVersion: z.string(),
  scoreKind: z.enum(["point", "interval"]).nullable(),
  totalScore: z.number().nullable(),
  totalScoreRange: z.tuple([z.number(), z.number()]).nullable(),
  coverage: z.number(),
  dimensions: z.array(dimensionSchema),
  deductions: z.array(scoreEventSchema),
  bonuses: z.array(scoreEventSchema),
  needsReview: z.boolean(),
  reviewLog: z.array(z.string()),
  warnings: z.array(z.string()),
  resumeQuestionCount: z.number(),
  answeredCount: z.number(),
  skippedCount: z.number(),
  unscoredCount: z.number(),
  scoredCount: z.number(),
  needsReviewCount: z.number(),
  summary: z.string().nullable(),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  turns: z.array(
    z.object({
      id: z.string(),
      question: z.string(),
      answerText: z.string(),
      status: z.string(),
      answerRevision: z.number(),
      score: turnScoreSchema.nullable(),
    }),
  ),
  resumeFlags: z.array(
    z.object({ quote: z.string(), reason: z.string(), confidence: z.number() }),
  ),
});
export type Report = z.infer<typeof reportSchema>;

export const diagnosticsSchema = z.object({
  version: z.string(),
  scoringVersion: z.string(),
  bankVersion: z.string(),
  api: z.literal("up"),
  database: z.enum(["up", "down"]),
  ocr: z.enum(["configured", "unconfigured"]),
  deepseek: z.enum(["configured", "unconfigured"]),
  cloudVerified: z.literal(false),
  audioRetentionEnabled: z.literal(false),
});
export const dashboardSchema = z.object({
  user: z.object({ id: z.string(), username: z.string() }),
  resumeCount: z.number(),
  practiceCount: z.number(),
  unfinishedCount: z.number(),
  defaultResumeId: z.string().nullable(),
  latestScore: z
    .object({
      sessionId: z.string(),
      stale: z.boolean(),
      scoreKind: z.enum(["point", "interval"]).nullable(),
      totalScore: z.number().nullable(),
      totalScoreRange: z.tuple([z.number(), z.number()]).nullable(),
    })
    .nullable(),
  resumeBytes: z.number(),
  audioBytes: z.number(),
  recent: z.array(
    z.object({
      id: z.string(),
      jobTitle: z.string(),
      count: z.number(),
      answered: z.number(),
      skipped: z.number(),
      currentIndex: z.number(),
      status: z.string(),
      updatedAt: z.string(),
      hasReport: z.boolean(),
    }),
  ),
  lastConfiguration: z
    .object({
      weights: z.record(z.string(), z.number()),
      jobTitle: z.string(),
      order: z.enum(["alternate", "knowledge_first"]),
      mode: z.enum(["knowledge", "interview"]),
      resumeId: z.string().nullable(),
    })
    .nullable(),
});

export const dataExportSchema = z.object({
  exportVersion: z.literal(1),
  exportedAt: z.string(),
  preferences: preferencesSchema,
  resumes: z.array(resumeSchema),
  practices: z.array(
    z.object({ practice: practiceSchema, report: reportSchema.nullable() }),
  ),
});
