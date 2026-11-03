import { readFileSync } from "node:fs";
import { scoringRulesSchema } from "@face/shared";
export const scoringRules = scoringRulesSchema.parse(
  JSON.parse(
    readFileSync(
      new URL(
        "../../../../../packages/rules/scoring/1.0.0.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as unknown,
);
