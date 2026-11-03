import { describe, expect, it } from "vitest";
import { runComponentFixture } from "./component-check-fixture";
function check(lines: number, reason = false) {
  const code =
    Array.from({ length: lines }, (_, i) => `// source line ${i + 1}`).join(
      "\n",
    ) + "\n";
  return runComponentFixture(
    { "sample.ts": code },
    reason
      ? "组件保留理由: apps/web/src/sample.ts | 单一配置数据模块，当前没有独立状态或第二个变化原因。"
      : undefined,
  );
}
describe("latest component line policy", () => {
  it.each([49, 50, 149, 150, 200, 201, 300])(
    "%i lines do not force a split",
    (lines) => {
      const result = check(lines);
      expect(result.status).toBe(0);
      if (lines <= 200) expect(result.output).not.toMatch(/REVIEW|WARN|ERROR/);
      else expect(result.output).toContain("REVIEW");
    },
  );
  it.each([301, 500])("%i lines require rationale or split", (lines) => {
    expect(check(lines).status).toBe(1);
    expect(check(lines, true).status).toBe(0);
  });
  it("rejects 501 even with rationale", () => {
    const result = check(501, true);
    expect(result.status).toBe(1);
    expect(result.output).toContain("no exception");
  });
  it("formatting catches compressed JSX", () => {
    const result = runComponentFixture({
      "Huge.tsx": `export function Huge(){return <div>${"<p>row</p>".repeat(510)}</div>}`,
    });
    expect(result.status).toBe(1);
  });
});
