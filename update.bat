@echo off
setlocal
chcp 65001 >nul
title FaceTime Update
set "FACE_UPDATE_ENTRY=%~f0"
rem 在同一个命令块内完成调度，避免 Git 更新 BAT 自身后 CMD 从旧偏移继续读取。
(
  powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$text=[IO.File]::ReadAllText($env:FACE_UPDATE_ENTRY,[Text.Encoding]::UTF8); $marker='# FACE_UPDATE_POWERSHELL'; $at=$text.LastIndexOf($marker); if($at -lt 0){exit 1}; & ([scriptblock]::Create($text.Substring($at+$marker.Length)))"
  if errorlevel 1 (
    goto update_failed
  )
  call "%~dp0scripts\start-dev.bat"
  if errorlevel 1 goto update_failed
  exit /b 0
)

:update_failed
echo.
echo 更新失败，请查看上方说明。本机配置和业务数据已保留。
pause
exit /b 1

# FACE_UPDATE_POWERSHELL
$ErrorActionPreference = 'Stop'
$entry = [IO.Path]::GetFullPath($env:FACE_UPDATE_ENTRY)
$root = Split-Path -Parent $entry
$bootstrapBackup = $null
$temporaryDirectory = $null

function Invoke-UpdateGit([string[]]$GitArguments, [string]$FailureMessage) {
  $ErrorActionPreference = 'Continue'
  $result = @(& git @GitArguments 2>&1)
  if ($LASTEXITCODE -ne 0) { throw $FailureMessage }
  return $result
}

try {
  foreach ($tool in @('git', 'node', 'npm.cmd')) {
    if (!(Get-Command $tool -ErrorAction SilentlyContinue)) { throw "未找到 $tool，请先安装 Git 和 Node.js 22.13.0 或更高版本。" }
  }
  Set-Location -LiteralPath $root
  $repository = (Invoke-UpdateGit @('rev-parse', '--show-toplevel') '请把 update.bat 放在已有项目的 Git 工作副本根目录。' | Out-String).Trim()
  if (![IO.Path]::GetFullPath($repository).Equals($root, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'update.bat 必须放在项目根目录，不能放在 scripts 子目录。'
  }
  $package = Get-Content -LiteralPath (Join-Path $root 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($package.name -ne 'face') { throw '当前目录不是 FaceTime 项目，已停止。' }
  $changes = @(Invoke-UpdateGit @('status', '--porcelain=v1', '--untracked-files=all') '无法检查本地 Git 状态。')
  # 首次从 GitHub 单独下载的 BAT 尚未被旧版本跟踪，只允许这一份引导文件。
  $otherChanges = @($changes | Where-Object { $_ -ne '?? update.bat' })
  if ($otherChanges.Count -gt 0) { throw '发现未提交或未跟踪的文件，请先保存并处理本地修改，再运行更新。不会自动覆盖、暂存或删除代码。' }
  $branch = (Invoke-UpdateGit @('symbolic-ref', '--quiet', '--short', 'HEAD') '当前处于分离 HEAD，请先切换到要更新的分支。' | Out-String).Trim()
  $remote = (Invoke-UpdateGit @('config', '--get', "branch.$branch.remote") '当前分支没有上游，请先为该分支设置远端跟踪关系。' | Out-String).Trim()
  if ($remote -eq '.') { throw '当前上游是本地分支，请先设置项目远端上游。' }
  Invoke-UpdateGit @('rev-parse', '--verify', '@{upstream}') '当前分支的上游不可用。' | Out-Null
  Write-Host "[1/6] 从当前分支 $branch 的上游获取最新代码……"
  Invoke-UpdateGit @('fetch', '--prune', $remote) '获取远端失败，请检查网络、Git 登录状态和远端访问权限。' | Out-Null
  Invoke-UpdateGit @('merge-base', '--is-ancestor', 'HEAD', '@{upstream}') '本地存在未推送提交或分支已分叉，无法快进更新；请先处理分支，不会强制重置。' | Out-Null
  if ($changes -contains '?? update.bat') {
    # PowerShell 已把引导代码读入内存；暂时移开自身，让 Git 可安全落地已跟踪的新 BAT。
    $temporaryDirectory = Join-Path ([IO.Path]::GetTempPath()) ('face-update-' + [Guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $temporaryDirectory | Out-Null
    $bootstrapBackup = Join-Path $temporaryDirectory 'update.bat'
    Move-Item -LiteralPath $entry -Destination $bootstrapBackup
  }
  try {
    Invoke-UpdateGit @('merge', '--ff-only', '@{upstream}') '代码快进更新失败，请检查文件锁定或 Git 状态；没有执行强制覆盖。' | Out-Null
  } finally {
    if ($bootstrapBackup -and !(Test-Path -LiteralPath $entry)) {
      Move-Item -LiteralPath $bootstrapBackup -Destination $entry
      $bootstrapBackup = $null
    }
  }
  $revision = (Invoke-UpdateGit @('rev-parse', '--short', 'HEAD') '无法读取更新后的版本。' | Out-String).Trim()
  Write-Host "代码已更新到 $revision。"
  $installer = Join-Path $root 'scripts/update-project.ps1'
  if (!(Test-Path -LiteralPath $installer -PathType Leaf)) { throw '远端版本还没有一键更新脚本。请先在主电脑提交并推送本轮完整改动，再重试。' }
  # 使用刚更新下来的编排代码，避免本次更新继续执行旧安装逻辑。
  $global:LASTEXITCODE = 0
  & $installer
  if ($LASTEXITCODE -ne 0) { throw '安装或验证失败，未继续启动，请查看上方步骤。' }
} catch {
  Write-Host ("更新失败：" + $_.Exception.Message) -ForegroundColor Red
  exit 1
} finally {
  if ($bootstrapBackup -and (Test-Path -LiteralPath $bootstrapBackup)) { Remove-Item -LiteralPath $bootstrapBackup -Force }
  if ($temporaryDirectory -and (Test-Path -LiteralPath $temporaryDirectory)) { Remove-Item -LiteralPath $temporaryDirectory }
}
