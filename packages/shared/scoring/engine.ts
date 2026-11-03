import { z } from "zod";
import type { AiScore } from "../contracts/ai.js";
import type { TurnScore } from "../contracts/workspace.js";
const dimension = z.object({
  rawMax: z.number().positive(),
  weight: z.number().nonnegative(),
});
export const scoringRulesSchema = z.object({
  version: z.string(),
  promptVersion: z.string(),
  confidenceMin: z.number(),
  intervalConfidenceMin: z.number(),
  resumeConfidenceMin: z.number(),
  minEffectiveChars: z.number(),
  coverageMin: z.number(),
  intervalRadius: z.number(),
  equationTolerance: z.number(),
  dimensionDeductionRatio: z.number(),
  dimensions: z.object({
    CONTENT: dimension,
    RESUME: dimension,
    FIT: dimension,
    FLUENCY: dimension,
    FILLER: dimension,
    BODY: dimension,
  }),
  events: z.record(
    z.string(),
    z.object({
      dimension: z.enum(["CONTENT", "RESUME", "FIT"]),
      kind: z.enum(["deduction", "bonus"]),
      points: z.number().positive(),
      cap: z.number().positive(),
      requiresFollowUp: z.boolean().optional(),
      requiresDictionary: z.boolean().optional(),
      requiresResumeQuote: z.boolean().optional(),
    }),
  ),
});
export type ScoringRules = z.infer<typeof scoringRulesSchema>;
export function aggregateDimensions(
  dimensions: TurnScore["dimensions"],
  forceInterval: boolean,
  rules: ScoringRules,
) {
  const active = dimensions.filter(
    (d) => d.status === "SCORED" && d.score !== null,
  );
  const weight = active.reduce((sum, d) => sum + d.weight, 0);
  const all = Object.values(rules.dimensions).reduce(
    (sum, d) => sum + d.weight,
    0,
  );
  const coverage = weight / all;
  if (!weight)
    return {
      scoreKind: null,
      totalScore: null,
      totalScoreRange: null,
      coverage,
    } as Pick<
      TurnScore,
      "scoreKind" | "totalScore" | "totalScoreRange" | "coverage"
    >;
  const total = Math.max(
    0,
    Math.min(
      100,
      active.reduce((sum, d) => sum + (d.score ?? 0) * d.weight, 0) / weight,
    ),
  );
  const interval = forceInterval || coverage < rules.coverageMin;
  const round = (value: number) => Math.round(value * 10) / 10;
  return {
    scoreKind: interval ? "interval" : "point",
    totalScore: interval ? null : round(total),
    totalScoreRange: interval
      ? [
          round(Math.max(0, total - rules.intervalRadius)),
          round(Math.min(100, total + rules.intervalRadius)),
        ]
      : null,
    coverage,
  } as Pick<
    TurnScore,
    "scoreKind" | "totalScore" | "totalScoreRange" | "coverage"
  >;
}
export function evaluateAnswer(
  ai: AiScore,
  context: {
    answer: string;
    resume: string;
    kind: string;
    answerRevision: number;
    resumeConfidence?: number | null;
  },
  rules: ScoringRules,
): TurnScore {
  const reviewLog: string[] = [];
  const used = new Set<string>();
  const byRule = new Map<string, number>();
  const dimTotals = new Map<string, number>();
  const invalid = new Set<string>();
  function events(
    list: AiScore["deductions"],
    kind: "deduction" | "bonus",
  ): TurnScore["deductions"] {
    return list.map((event) => {
      const rule = rules.events[event.ruleId];
      const key = kind + event.ruleId + event.evidence;
      let reason = "";
      if (
        !rule ||
        rule.kind !== kind ||
        rule.dimension !== event.dimension ||
        event.points !== rule.points
      )
        reason = "未知规则或分值不符";
      else if (!context.answer.includes(event.evidence))
        reason = "回答证据非逐字引用";
      else if (event.resumeQuote && !context.resume.includes(event.resumeQuote))
        reason = "简历引用不存在";
      else if (rule.requiresResumeQuote && !event.resumeQuote)
        reason = "缺少双引用";
      else if (
        event.dimension === "RESUME" &&
        (context.resumeConfidence ?? 1) < rules.resumeConfidenceMin
      )
        reason = "简历疑点低置信度，需复核";
      else if (rule.requiresFollowUp || rule.requiresDictionary)
        reason = "缺少追问或已审核词典依据";
      else if (ai.needsReview || ai.status !== "scored")
        reason = "模型要求复核";
      else if (
        event.confidence < rules.confidenceMin ||
        ai.confidence < rules.confidenceMin
      )
        reason = "低置信度，需复核";
      else if (used.has(key)) reason = "重复事件";
      let points = event.points;
      if (reason) {
        reviewLog.push(event.ruleId + "：" + reason);
        invalid.add(event.dimension);
      } else {
        used.add(key);
        const ruleKey = kind + event.ruleId;
        points = Math.min(points, rule.cap - (byRule.get(ruleKey) ?? 0));
        if (kind === "deduction")
          points = Math.min(
            points,
            rules.dimensions[event.dimension].rawMax *
              rules.dimensionDeductionRatio -
              (dimTotals.get(event.dimension) ?? 0),
          );
        if (points <= 0) return { ...event, status: "WAIVED" as const };
        byRule.set(ruleKey, (byRule.get(ruleKey) ?? 0) + points);
        if (kind === "deduction")
          dimTotals.set(
            event.dimension,
            (dimTotals.get(event.dimension) ?? 0) + points,
          );
      }
      return {
        ...event,
        points,
        status: reason ? ("PENDING_REVIEW" as const) : ("APPLIED" as const),
      };
    });
  }
  const deductions = events(ai.deductions, "deduction"),
    bonuses = events(ai.bonuses, "bonus");
  const keys = { CONTENT: "content", RESUME: "resume", FIT: "fit" } as const;
  const dimensions: TurnScore["dimensions"] = Object.entries(
    rules.dimensions,
  ).map(([code, config]) => {
    const typed = code as TurnScore["dimensions"][number]["code"];
    if (code === "BODY")
      return {
        code: typed,
        ...config,
        raw: null,
        score: null,
        status: "NOT_ENABLED",
      };
    if (
      code === "FLUENCY" ||
      code === "FILLER" ||
      (code === "RESUME" && context.kind !== "resume")
    )
      return {
        code: typed,
        ...config,
        raw: null,
        score: null,
        status: "NOT_APPLICABLE",
      };
    const key = keys[code as keyof typeof keys];
    const raw = ai.scores[key],
      base = ai.bases[key];
    let ok =
      raw !== null &&
      base !== null &&
      base <= config.rawMax &&
      !invalid.has(code) &&
      !ai.needsReview &&
      ai.status === "scored";
    const applied = (items: TurnScore["deductions"]) =>
      items
        .filter((e) => e.dimension === code && e.status === "APPLIED")
        .reduce((sum, e) => sum + e.points, 0);
    if (
      raw !== null &&
      base !== null &&
      Math.abs(
        Math.min(
          config.rawMax,
          Math.max(0, base - applied(deductions) + applied(bonuses)),
        ) - raw,
      ) > rules.equationTolerance
    ) {
      ok = false;
      reviewLog.push(code + "：加扣分等式不成立");
    }
    if (ai.confidence < rules.intervalConfidenceMin) ok = false;
    if (!ok)
      return {
        code: typed,
        ...config,
        raw: null,
        score: null,
        status: "NEEDS_REVIEW",
      };
    return {
      code: typed,
      ...config,
      raw,
      score: ((raw ?? 0) / config.rawMax) * 100,
      status: "SCORED",
    };
  });
  for (const event of [...deductions, ...bonuses])
    if (
      event.status === "APPLIED" &&
      dimensions.find((d) => d.code === event.dimension)?.status !== "SCORED"
    )
      event.status = "PENDING_REVIEW";
  const forceInterval =
    ai.confidence < rules.intervalConfidenceMin ||
    (context.answer.match(/[\p{L}\p{N}]/gu)?.length ?? 0) <
      rules.minEffectiveChars;
  const aggregate = aggregateDimensions(dimensions, forceInterval, rules);
  return {
    scoringVersion: rules.version,
    promptVersion: rules.promptVersion,
    answerRevision: context.answerRevision,
    confidence: ai.confidence,
    ...aggregate,
    dimensions: dimensions.map((d) => ({
      ...d,
      score: d.score === null ? null : Math.round(d.score * 10) / 10,
    })),
    deductions,
    bonuses,
    needsReview:
      dimensions.some((d) => d.status === "NEEDS_REVIEW") || forceInterval,
    reviewLog,
    improvements: ai.improvements,
  };
}
