import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";

// Publication guard only: never prints matched values or reads Oracle tables.
const root = process.cwd();
const git = (args) =>
  execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
const list = (args) => git(args).split("\0").filter(Boolean);
const files = [
  ...new Set(
    list(["ls-files", "-z", "--cached", "--others", "--exclude-standard"]),
  ),
];
const staged = new Set(list(["ls-files", "--cached", "-z"]));
const knownSecrets = [];
for (const name of [".env", "apps/api/.env", "apps/web/.env.local"]) {
  if (!existsSync(join(root, name))) continue;
  for (const line of readFileSync(join(root, name), "utf8").split(/\r?\n/)) {
    const match = line.match(
      /^\s*([A-Z_]*(?:PASSWORD|SECRET|API_KEY|ACCESS_TOKEN|BAIDU_AK|BAIDU_SK))\s*=\s*(.*?)\s*$/,
    );
    const value = match?.[2]?.replace(/^["']|["']$/g, "");
    if (value && value.length >= 8) knownSecrets.push(value);
  }
}
function forbiddenPath(path) {
  const name = basename(path).toLowerCase();
  return (
    (name.startsWith(".env") && name !== ".env.example") ||
    /(?:^|\/)(?:node_modules|dist|wallet)(?:\/|$)/i.test(path) ||
    /^apps\/api\/(?:data|uploads|storage)\//.test(path) ||
    /\.(?:dmp|dump|sqlite3?|db|log|pem|key|p12|pfx|jks|sso|wav|mp3|m4a|webm)$/i.test(
      name,
    ) ||
    /^ewallet/i.test(name)
  );
}
const patterns = [
  ["PRIVATE_KEY", /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----/],
  ["API_TOKEN", /\bsk-[A-Za-z0-9_-]{20,}\b/],
  [
    "GITHUB_TOKEN",
    /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/,
  ],
  ["AWS_ACCESS_KEY", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
];
const issues = [];
function inspect(path, content, layer) {
  if (content.includes("\0")) return; // Binary prototypes are reviewed source assets.
  for (const [index, line] of content.split(/\r?\n/).entries()) {
    if (knownSecrets.some((secret) => line.includes(secret)))
      issues.push(`${path}:${index + 1} [${layer}/LOCAL_SECRET]`);
    for (const [code, regex] of patterns)
      if (regex.test(line))
        issues.push(`${path}:${index + 1} [${layer}/${code}]`);
    const assignment = line.match(
      /(?:DB_PASSWORD|API_KEY|CLIENT_SECRET|SECRET_KEY|ACCESS_TOKEN|DEEPSEEK_API_KEY|BAIDU_AK|BAIDU_SK)["']?[ \t]*[:=][ \t]*["']([^"'\r\n]+)["']/,
    );
    if (assignment) {
      const value = assignment[1];
      const placeholder =
        /^(?:$|<|\*|YOUR_|REPLACE_|CHANGE_|TODO|process\.|env\.|config\.|\$\{)/i.test(
          value,
        ) || /^(?:string|secret|password|token|test|example)$/i.test(value);
      if (!placeholder && value.length >= 8)
        issues.push(`${path}:${index + 1} [${layer}/SECRET_LITERAL]`);
    }
  }
}
for (const path of files) {
  if (forbiddenPath(path)) {
    issues.push(`${path} [FORBIDDEN_PUBLIC_PATH]`);
    continue;
  }
  const full = join(root, path);
  if (existsSync(full) && statSync(full).isFile())
    inspect(path, readFileSync(full, "utf8"), "worktree");
  if (staged.has(path)) inspect(path, git(["show", `:${path}`]), "staged");
}
if (issues.length) {
  console.error(
    `Public repository check FAILED (${issues.length}); values are redacted.`,
  );
  for (const issue of [...new Set(issues)]) console.error(issue);
  process.exitCode = 1;
} else
  console.log(
    `Public repository check passed: ${files.length} candidate files and staged content; local credentials excluded.`,
  );
