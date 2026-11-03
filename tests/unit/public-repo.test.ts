import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const guard = resolve("scripts/check-public-repo.mjs");
function fixture(
  run: (repo: string, put: (name: string, text: string) => void) => void,
) {
  const repo = mkdtempSync(join(tmpdir(), "face-public-check-"));
  const put = (name: string, text: string) => {
    const p = join(repo, name);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, text);
  };
  try {
    execFileSync("git", ["init", "--quiet"], { cwd: repo });
    put(".gitignore", ".env\n.env.*\n!.env.example\n");
    run(repo, put);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
}
function inspect(repo: string) {
  const r = spawnSync(process.execPath, [guard], {
    cwd: repo,
    encoding: "utf8",
  });
  return { status: r.status, text: r.stdout + r.stderr };
}
const token = "gh" + "p_" + "x".repeat(36);
describe("public repository publication guard", () => {
  it("allows ordinary source and empty configuration template", () =>
    fixture((repo, put) => {
      put("apps/api/.env.example", "DB_PASSWORD=\n");
      put("README.md", "Public source only");
      expect(inspect(repo).status).toBe(0);
    }));
  it("does not expose an ignored local credential", () =>
    fixture((repo, put) => {
      put("apps/api/.env", `DB_PASSWORD=${token}\n`);
      const result = inspect(repo);
      expect(result.status).toBe(0);
      expect(result.text).not.toContain(token);
    }));
  it("blocks forced staging of a real environment file", () =>
    fixture((repo, put) => {
      put("apps/api/.env", `DB_PASSWORD=${token}\n`);
      execFileSync("git", ["add", "-f", "apps/api/.env"], { cwd: repo });
      const result = inspect(repo);
      expect(result.status).toBe(1);
      expect(result.text).toContain("FORBIDDEN_PUBLIC_PATH");
      expect(result.text).not.toContain(token);
    }));
  it("checks staged content even when worktree was cleaned", () =>
    fixture((repo, put) => {
      put("sample.txt", token);
      execFileSync("git", ["add", "sample.txt"], { cwd: repo });
      put("sample.txt", "clean text");
      const result = inspect(repo);
      expect(result.status).toBe(1);
      expect(result.text).toContain("staged/GITHUB_TOKEN");
      expect(result.text).not.toContain(token);
    }));
  it("detects a copied local secret regardless of variable name", () =>
    fixture((repo, put) => {
      const secret = "local-only-" + "z".repeat(24);
      put("apps/api/.env", `DB_PASSWORD=${secret}\n`);
      put("copied.txt", secret);
      const result = inspect(repo);
      expect(result.status).toBe(1);
      expect(result.text).toContain("LOCAL_SECRET");
      expect(result.text).not.toContain(secret);
    }));
  it("blocks private database export files", () =>
    fixture((repo, put) => {
      put("backup.dmp", "private dump");
      expect(inspect(repo).status).toBe(1);
    }));
});
