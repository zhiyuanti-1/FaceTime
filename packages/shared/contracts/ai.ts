import { z } from "zod";
export const aiDimension = z.enum(["CONTENT", "RESUME", "FIT"]);
const quote = z.string().min(1).max(500);
export const aiEventSchema = z
  .object({
    ruleId: z.string().max(40),
    dimension: aiDimension,
    points: z.number().positive().max(100),
    evidence: quote,
    resumeQuote: z.string().max(500).nullable(),
    confidence: z.number().min(0).max(1),
  })
  .strict();
const rawScores = z
  .object({
    content: z.number().min(0).max(40).nullable(),
    resume: z.number().min(0).max(15).nullable(),
    fit: z.number().min(0).max(10).nullable(),
  })
  .strict();
export const aiScoreSchema = z
  .object({
    status: z.enum(["scored", "needs_review"]),
    confidence: z.number().min(0).max(1),
    bases: rawScores,
    scores: rawScores.extend({ filler: z.null(), body: z.null() }),
    deductions: z.array(aiEventSchema).max(20),
    bonuses: z.array(aiEventSchema).max(20),
    followUp: z.null(),
    resumeFlags: z
      .array(
        z
          .object({
            quote,
            reason: z.string().max(300),
            confidence: z.number().min(0).max(1),
          })
          .strict(),
      )
      .max(5),
    improvements: z.array(z.string().max(500)).max(5),
    needsReview: z.boolean(),
  })
  .strict();
export type AiScore = z.infer<typeof aiScoreSchema>;
export const resumeAnalysisSchema = z
  .object({
    summary: z.string().max(120),
    name: z.string().max(100).nullable(),
    targetRole: z.string().max(100).nullable(),
    projects: z
      .array(
        z
          .object({
            name: z.string().max(100),
            quote,
            questions: z.array(z.string().max(60)).min(1).max(4),
          })
          .strict(),
      )
      .max(10),
    suspicions: z
      .array(
        z
          .object({
            quote,
            reason: z.string().max(300),
            severity: z.number().int().min(1).max(3),
            confidence: z.number().min(0).max(1),
          })
          .strict(),
      )
      .max(10),
  })
  .strict();
export type ResumeAnalysis = z.infer<typeof resumeAnalysisSchema>;
export const probeSchema = z
  .object({
    source: z.enum(["suspicion", "project", "gap_fill"]),
    target: z.string().max(120),
    question: z.string().min(1).max(60),
    anchorQuote: z.string().min(1).max(80).nullable(),
    severity: z.number().int().min(1).max(3),
    confidence: z.number().min(0).max(1),
  })
  .strict();
export const probePlanSchema = z
  .object({ probes: z.array(probeSchema).length(5) })
  .strict();
export const finalSummarySchema = z
  .object({
    summary: z.string().max(1000),
    strengths: z.array(z.string().max(300)).max(5),
    improvements: z.array(z.string().max(300)).max(5),
  })
  .strict();
