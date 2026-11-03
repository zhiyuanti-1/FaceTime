import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const checker = resolve("scripts/check-components.mjs");
export function runComponentFixture(
  files: Record<string, string>,
  review = "无保留理由",
) {
  const dir = mkdtempSync(join(tmpdir(), "face-component-policy-"));
  try {
    mkdirSync(join(dir, "docs"));
    writeFileSync(join(dir, "docs/进度.md"), review);
    for (const [name, code] of Object.entries(files)) {
      const file = join(dir, "apps", "web", "src", name);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, code);
    }
    const result = spawnSync(process.execPath, [checker], {
      cwd: dir,
      encoding: "utf8",
    });
    return { status: result.status, output: result.stdout + result.stderr };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
