import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { format } from "prettier";
import {
  findComponents,
  analyzeComponent,
  candidateReasons,
  findPropDrilling,
  findExactDuplicates,
} from "./component-analysis.mjs";

const root = process.cwd();
const progress = readFileSync(join(root, "docs/进度.md"), "utf8");
function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory()
      ? walk(path)
      : /\.(ts|tsx|css)$/.test(entry.name)
        ? [path]
        : [];
  });
}
let failures = 0;
const counts = [],
  components = [],
  formattedFiles = new Map();
function assess(name, count) {
  counts.push({ name, count });
  if (count > 500) {
    console.error(
      `ERROR ${name}: ${count} lines > 500; must split, no exception.`,
    );
    failures++;
  } else if (count > 300) {
    const records = progress.split("\n");
    const decision = records.find(
      (line) =>
        line.includes(`组件保留理由: ${name} |`) &&
        line.split("|").slice(1).join("|").trim().length >= 12,
    );
    if (!decision) {
      console.error(
        `ERROR ${name}: ${count} lines > 300; split or record '组件保留理由: ${name} | concrete reason' in docs/进度.md.`,
      );
      failures++;
    } else
      console.warn(
        `WARN ${name}: ${count} lines; recorded rationale requires review.`,
      );
  } else if (count > 200)
    console.info(
      `REVIEW ${name}: ${count} lines; exceeds recommendation, no mandatory split.`,
    );
}
for (const file of walk(join(root, "apps", "web", "src"))) {
  const formatted = await format(readFileSync(file, "utf8"), {
    parser: file.endsWith(".css") ? "css" : "typescript",
    filepath: file,
  });
  formattedFiles.set(file, formatted);
  assess(
    relative(root, file).replaceAll("\\", "/"),
    formatted.trimEnd().split("\n").length,
  );
}
const options = {
  noLib: true,
  types: [],
  jsx: ts.JsxEmit.Preserve,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
};
const host = ts.createCompilerHost(options);
const normalize = (file) => file.replaceAll("\\", "/").toLowerCase();
const byPath = new Map(
  [...formattedFiles].map(([file, code]) => [normalize(file), code]),
);
const originalGetSource = host.getSourceFile.bind(host);
host.getSourceFile = (file, target, ...args) =>
  byPath.has(normalize(file))
    ? ts.createSourceFile(
        file,
        byPath.get(normalize(file)),
        target,
        true,
        file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      )
    : originalGetSource(file, target, ...args);
const program = ts.createProgram(
  [...formattedFiles.keys()].filter((file) => !file.endsWith(".css")),
  options,
  host,
);
const checker = program.getTypeChecker();
const sources = [];
for (const [file] of formattedFiles) {
  if (file.endsWith(".css")) continue;
  const source = program.getSourceFile(file);
  if (!source) continue;
  sources.push(source);
  for (const component of findComponents(source)) {
    const scope = `${relative(root, file).replaceAll("\\", "/")}#${component.name}`;
    const count =
      source.getLineAndCharacterOfPosition(component.node.getEnd()).line -
      source.getLineAndCharacterOfPosition(component.node.getStart(source))
        .line +
      1;
    assess(scope, count);
    const metrics = analyzeComponent(component, source, checker);
    const reasons = candidateReasons(metrics);
    if (reasons.length)
      console.warn(
        `CANDIDATE ${scope}: ${reasons.join(", ")}${count < 50 ? "; <50 lines: single-responsibility exemption may apply" : ""}`,
      );
    components.push({
      ...component,
      scope,
      metrics,
      symbol: checker.getSymbolAtLocation(component.node.name),
    });
  }
}
for (const chain of findPropDrilling(components))
  console.warn(`CANDIDATE prop forwarding >=3 levels: ${chain}`);
for (const group of findExactDuplicates(sources)) {
  console.warn(
    `REUSE >=2 exact UI/logic blocks: ${group.join(", ")}; extract shared component unless <10-line/single-responsibility lower bound applies.`,
  );
}
console.log(
  `Component/module checks: ${counts.length} scopes, max ${Math.max(0, ...counts.map((item) => item.count))} lines, ${failures} failures.`,
);
if (failures) process.exitCode = 1;
