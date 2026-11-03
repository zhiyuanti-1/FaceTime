import type { AiScore } from "../contracts/ai.js";
import type { TurnScore } from "../contracts/workspace.js";
import { aggregateDimensions, type ScoringRules } from "./engine.js";
// Report-only session bonus budgets; immutable per-answer source scores remain unchanged.
export function applySessionBonusCaps(
  items: { score: TurnScore; bases: AiScore["bases"] }[],
  rules: ScoringRules,
) {
  const used = new Map<string, number>();
  return items.map((item) => {
    const score = structuredClone(item.score);
    for (const event of score.bonuses.filter((e) => e.status === "APPLIED")) {
      const rule = rules.events[event.ruleId];
      if (!rule) continue;
      const remaining = Math.max(0, rule.cap - (used.get(event.ruleId) ?? 0));
      if (!remaining) {
        event.status = "WAIVED";
        continue;
      }
      event.points = Math.min(event.points, remaining);
      used.set(event.ruleId, (used.get(event.ruleId) ?? 0) + event.points);
    }
    const keys = { CONTENT: "content", RESUME: "resume", FIT: "fit" } as const;
    for (const dimension of score.dimensions) {
      if (dimension.status !== "SCORED" || !(dimension.code in keys)) continue;
      const key = keys[dimension.code as keyof typeof keys];
      const base = item.bases[key];
      if (base === null) continue;
      const sum = (events: TurnScore["bonuses"]) =>
        events
          .filter(
            (e) => e.status === "APPLIED" && e.dimension === dimension.code,
          )
          .reduce((value, e) => value + e.points, 0);
      dimension.raw = Math.max(
        0,
        Math.min(
          dimension.rawMax,
          base - sum(score.deductions) + sum(score.bonuses),
        ),
      );
      dimension.score = (dimension.raw / dimension.rawMax) * 100;
    }
    return {
      ...score,
      ...aggregateDimensions(
        score.dimensions,
        score.scoreKind === "interval" || score.needsReview,
        rules,
      ),
    };
  });
}
