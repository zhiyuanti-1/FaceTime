$ErrorActionPreference = "Stop"

# 只复用当前支持的模型，避免升级后静默沿用旧进程。
$existingModel = $null
try {
  if ((Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:17861/health" -TimeoutSec 3).StatusCode -eq 200) {
    $existingModel = Invoke-RestMethod -Uri "http://127.0.0.1:17861/v1/models" -TimeoutSec 3
  }
} catch { Write-Verbose "本机模型尚未就绪，将检查安装资源并启动" }
if ($null -ne $existingModel) {
  if ($existingModel.data.id -notcontains "Qwen2.5-3B-Instruct") { throw "17861 端口运行的不是当前 Qwen2.5-3B-Instruct，请停止旧模型后重新启动" }
  Write-Host "本机 Qwen2.5-3B-Instruct 已在 17861 端口运行，沿用现有进程"
  while ($true) { Start-Sleep -Seconds 60 }
}

$runtime = Join-Path $PSScriptRoot "../apps/api/data"
$server = Get-Item -LiteralPath (Join-Path $runtime "llama-cuda/llama-server.exe") -ErrorAction SilentlyContinue
$model = Join-Path $runtime "models/qwen2.5-3b-instruct-q4_k_m.gguf"
if (!$server -or !(Test-Path -LiteralPath $model)) {
  throw "请先运行 scripts/install-local-resume.ps1 -Component Model，确认 3B 模型及 CUDA 运行资源均已安装"
}
$devices = @(& $server.FullName --list-devices)
if ($LASTEXITCODE -ne 0) { throw "无法枚举 CUDA 设备" }
$selected = $devices | Select-String '^\s*(CUDA\d+):.*NVIDIA' | Select-Object -First 1
if (!$selected) { throw "未找到可用的 NVIDIA CUDA GPU，请检查运行资源及显卡驱动" }
$device = $selected.Matches[0].Groups[1].Value
Write-Host ("本机模型使用 " + $selected.Line.Trim())
& $server.FullName --model $model --alias Qwen2.5-3B-Instruct --host 127.0.0.1 --port 17861 --jinja --reasoning off --ctx-size 8192 --device $device --n-gpu-layers 99 --parallel 1 --no-webui --log-disable
exit $LASTEXITCODE
