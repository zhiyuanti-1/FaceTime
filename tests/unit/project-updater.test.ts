import { afterEach, describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { resolve, join, sep } from "node:path";

const workspace = resolve(import.meta.dirname, "../..");
const fixtureBase = join(workspace, "apps/api/data");
const helper = join(workspace, "scripts/update-project.ps1");
const updater = readFileSync(join(workspace, "update.bat"), "utf8");
const fixtures: string[] = [];
function fixture() {
  mkdirSync(fixtureBase, { recursive: true });
  const root = mkdtempSync(join(fixtureBase, "updater-test-"));
  fixtures.push(root);
  return root;
}
function psLiteral(value: string) {
  return "'" + value.replaceAll("'", "''") + "'";
}
function powershell(code: string, cwd: string) {
  return spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-NonInteractive",
      "-EncodedCommand",
      Buffer.from("$ErrorActionPreference='Stop'; " + code, "utf16le").toString(
        "base64",
      ),
    ],
    { cwd, encoding: "utf8", timeout: 30000 },
  );
}
function file(root: string, relative: string, value = "合成资源") {
  const path = join(root, relative);
  mkdirSync(resolve(path, ".."), { recursive: true });
  writeFileSync(path, value);
  return path;
}
function git(cwd: string, ...args: string[]) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}
function commit(cwd: string, message: string) {
  git(cwd, "add", ".");
  git(
    cwd,
    "-c",
    "user.name=合成验证",
    "-c",
    "user.email=updater@example.invalid",
    "-c",
    "core.hooksPath=disabled-hooks",
    "commit",
    "-m",
    message,
  );
}
afterEach(() => {
  for (const root of fixtures.splice(0)) {
    if (!resolve(root).startsWith(resolve(fixtureBase) + sep))
      throw new Error("验证目录越界");
    rmSync(root, { recursive: true, force: true });
  }
});

describe.skipIf(process.platform !== "win32")("Windows 一键更新边界", () => {
  it.each([false, true])(
    "旧副本首次引导保留配置，安装失败时不启动：%s",
    (failInstall) => {
      const root = fixture();
      const seed = join(root, "seed");
      const remote = join(root, "remote.git");
      const clone = join(root, "带空格的旧副本");
      mkdirSync(seed);
      git(root, "init", "--bare", "--initial-branch=main", remote);
      git(seed, "init", "--initial-branch=main");
      file(seed, "package.json", '{"name":"face"}');
      file(seed, ".gitignore", ".env\n");
      file(
        seed,
        "scripts/start-dev.bat",
        "@echo off\r\necho fixture-started\r\nexit /b 0\r\n",
      );
      commit(seed, "旧副本");
      git(seed, "remote", "add", "githubFaceTime", remote);
      git(seed, "push", "-u", "githubFaceTime", "main");
      git(root, "clone", remote, clone);
      file(clone, ".env", "合成本机配置");
      file(clone, "update.bat", updater);
      file(seed, "update.bat", updater);
      file(
        seed,
        "scripts/update-project.ps1",
        failInstall
          ? "exit 1\n"
          : "[IO.File]::WriteAllText((Join-Path (Split-Path -Parent $PSScriptRoot) 'installed.txt'),'ok')\n",
      );
      commit(seed, "加入一键更新");
      git(seed, "push");
      const run = spawnSync("cmd.exe", ["/d", "/c", "update.bat"], {
        cwd: clone,
        encoding: "utf8",
        input: "\r\n",
        timeout: 30000,
      });
      expect(run.status, run.stdout + run.stderr).toBe(failInstall ? 1 : 0);
      if (failInstall) expect(run.stdout).not.toContain("fixture-started");
      else expect(run.stdout).toContain("fixture-started");
      expect(git(clone, "rev-parse", "HEAD")).toBe(
        git(seed, "rev-parse", "HEAD"),
      );
      if (failInstall)
        expect(existsSync(join(clone, "installed.txt"))).toBe(false);
      else
        expect(readFileSync(join(clone, "installed.txt"), "utf8")).toBe("ok");
      expect(readFileSync(join(clone, ".env"), "utf8")).toBe("合成本机配置");
    },
    40000,
  );

  it("本地代码修改时拒绝更新，不执行安装", () => {
    const root = fixture();
    git(root, "init", "--initial-branch=main");
    file(root, "package.json", '{"name":"face"}');
    file(root, "update.bat", updater);
    file(root, "scripts/update-project.ps1", "throw '不应执行安装'\n");
    commit(root, "合成基线");
    file(root, "package.json", '{"name":"face","local":true}');
    const before = git(root, "rev-parse", "HEAD");
    const run = spawnSync("cmd.exe", ["/d", "/c", "update.bat"], {
      cwd: root,
      encoding: "utf8",
      input: "\r\n",
      timeout: 30000,
    });
    expect(run.status, run.stdout + run.stderr).toBe(1);
    expect(git(root, "rev-parse", "HEAD")).toBe(before);
    expect(readFileSync(join(root, "package.json"), "utf8")).toContain(
      '"local":true',
    );
    expect(run.stdout + run.stderr).not.toContain("不应执行安装");
  }, 40000);

  it("清理只删除已知旧模型，保留新模型、未知模型和本机配置", () => {
    const root = fixture();
    const old = file(
      root,
      "apps/api/data/models/qwen2.5-7b-instruct-q4_k_m-00001-of-00002.gguf",
    );
    const oldRuntime = file(root, "apps/api/data/llama-vulkan/old.dll");
    const current = file(
      root,
      "apps/api/data/models/qwen2.5-3b-instruct-q4_k_m.gguf",
    );
    const unknown = file(root, "apps/api/data/models/个人模型.gguf");
    const config = file(root, "apps/api/.env");
    const resume = file(root, "apps/api/data/resumes/合成资料.txt");
    const run = powershell(
      `. ${psLiteral(helper)}; Remove-ObsoleteResources ${psLiteral(root)}`,
      root,
    );
    expect(run.status, run.stdout + run.stderr).toBe(0);
    expect(existsSync(old)).toBe(false);
    expect(existsSync(oldRuntime)).toBe(false);
    for (const path of [current, unknown, config, resume])
      expect(existsSync(path)).toBe(true);
  });

  it("远端和本地分叉时不强制覆盖本地提交", () => {
    const root = fixture();
    const seed = join(root, "seed");
    const remote = join(root, "remote.git");
    const clone = join(root, "clone");
    mkdirSync(seed);
    git(root, "init", "--bare", "--initial-branch=main", remote);
    git(seed, "init", "--initial-branch=main");
    file(seed, "package.json", '{"name":"face"}');
    file(seed, "update.bat", updater);
    file(seed, "scripts/update-project.ps1", "throw '不应进入安装'\n");
    commit(seed, "共同基线");
    git(seed, "remote", "add", "githubFaceTime", remote);
    git(seed, "push", "-u", "githubFaceTime", "main");
    git(root, "clone", remote, clone);
    file(clone, "local.txt", "保留本地提交");
    commit(clone, "本地提交");
    file(seed, "remote.txt", "远端提交");
    commit(seed, "远端提交");
    git(seed, "push");
    const before = git(clone, "rev-parse", "HEAD");
    const run = spawnSync("cmd.exe", ["/d", "/c", "update.bat"], {
      cwd: clone,
      encoding: "utf8",
      input: "\r\n",
      timeout: 30000,
    });
    expect(run.status, run.stdout + run.stderr).toBe(1);
    expect(git(clone, "rev-parse", "HEAD")).toBe(before);
    expect(existsSync(join(clone, "local.txt"))).toBe(true);
    expect(git(clone, "rev-parse", "origin/main")).toBe(
      git(seed, "rev-parse", "HEAD"),
    );
    expect(existsSync(join(clone, "remote.txt"))).toBe(false);
  }, 40000);

  it("依赖安装失败时保留旧模型和本机配置", () => {
    const root = fixture();
    const old = file(
      root,
      "apps/api/data/models/qwen2.5-7b-instruct-q4_k_m-00001-of-00002.gguf",
    );
    const config = file(root, "apps/api/.env", "合成本机配置");
    file(
      root,
      "fake-bin/npm.cmd",
      "@echo off\r\necho updater-npm-failure\r\nexit /b 9\r\n",
    );
    const code = `. ${psLiteral(helper)}; $env:Path=${psLiteral(join(root, "fake-bin"))}+';'+$env:Path; Invoke-ProjectUpdate ${psLiteral(root)}`;
    const run = powershell(code, root);
    expect(run.status).not.toBe(0);
    expect(run.stdout).toContain("updater-npm-failure");
    expect(existsSync(old)).toBe(true);
    expect(readFileSync(config, "utf8")).toBe("合成本机配置");
  });

  it("资源目录中的联接指向外部时拒绝整批清理", () => {
    const root = fixture();
    const outside = join(root, "应保留");
    const protectedFile = file(outside, "keep.txt");
    const project = join(root, "project");
    const old = file(
      project,
      "apps/api/data/models/qwen2.5-7b-instruct-q4_k_m-00001-of-00002.gguf",
    );
    const runtime = join(project, "apps/api/data/llama-vulkan");
    mkdirSync(runtime, { recursive: true });
    symlinkSync(outside, join(runtime, "链接"), "junction");
    const run = powershell(
      `. ${psLiteral(helper)}; Remove-ObsoleteResources ${psLiteral(project)}`,
      project,
    );
    expect(run.status).not.toBe(0);
    expect(existsSync(protectedFile)).toBe(true);
    expect(existsSync(old)).toBe(true);
  });

  it("拒绝越过工作区的清理路径", () => {
    const root = fixture();
    const run = powershell(
      `. ${psLiteral(helper)}; Get-UpdatePath ${psLiteral(root)} '../不应访问'`,
      root,
    );
    expect(run.status).not.toBe(0);
  });

  it("进程筛选包含本目录 watcher 子进程，排除同名前缀目录和其他 Node", () => {
    const root = fixture();
    const code = `. ${psLiteral(helper)}; $root=${psLiteral(root)}; $all=@(
      [pscustomobject]@{Name='node.exe';ProcessId=101;ParentProcessId=1;CommandLine=('node "'+(Join-Path $root 'node_modules/.bin/../tsx/dist/cli.mjs')+'" watch src/main.ts');ExecutablePath='node.exe'},
      [pscustomobject]@{Name='node.exe';ProcessId=102;ParentProcessId=101;CommandLine='node child';ExecutablePath='C:\\node.exe'},
      [pscustomobject]@{Name='node.exe';ProcessId=103;ParentProcessId=1;CommandLine=('node "'+(Join-Path ($root+'2') 'node_modules/vite/bin/vite.js')+'"');ExecutablePath='node.exe'},
      [pscustomobject]@{Name='node.exe';ProcessId=104;ParentProcessId=1;CommandLine='node other';ExecutablePath='C:\\node.exe'}
      ); @(Get-ProjectProcesses $root $all | ForEach-Object {$_.ProcessId} | Sort-Object) | ConvertTo-Json -Compress`;
    const run = powershell(code, root);
    expect(run.status, run.stdout + run.stderr).toBe(0);
    expect(JSON.parse(run.stdout)).toEqual([101, 102]);
  });
});
