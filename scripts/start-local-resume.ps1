$ErrorActionPreference = "Stop"

# 17861 已有健康的本机模型时直接等待，避免重复启动后端口冲突导致 concurrently -k 停掉前后端
try {
  if ((Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:17861/health" -TimeoutSec 3).StatusCode -eq 200) {
    Write-Host "本机模型已在 17861 端口运行，沿用现有进程"
    while ($true) { Start-Sleep -Seconds 60 }
  }
} catch {}

$runtime = Join-Path $PSScriptRoot "../apps/api/data"
$server = Get-ChildItem -Path (Join-Path $runtime "llama-vulkan") -Filter "llama-server.exe" -Recurse -File | Select-Object -First 1
$model = Join-Path $runtime "models/qwen2.5-7b-instruct-q4_k_m-00001-of-00002.gguf"
$secondModel = Join-Path $runtime "models/qwen2.5-7b-instruct-q4_k_m-00002-of-00002.gguf"
if (!$server -or !(Test-Path -LiteralPath $model) -or !(Test-Path -LiteralPath $secondModel)) {
  throw "请先运行 scripts/install-local-resume.ps1 -Component Model，确认两个模型分片及运行资源均已安装"
}
$devices = @(& $server.FullName --list-devices)
if ($LASTEXITCODE -ne 0) { throw "无法枚举 Vulkan 设备" }
$selected = $devices | Select-String '^\s*(Vulkan\d+):.*NVIDIA' | Select-Object -First 1
if (!$selected) { $selected = $devices | Select-String '^\s*(Vulkan\d+):' | Select-Object -First 1 }
if (!$selected) { throw "未找到可用的 Vulkan GPU，请检查显卡驱动" }
$device = $selected.Matches[0].Groups[1].Value
Write-Host ("本机模型使用 " + $selected.Line.Trim())
& $server.FullName --model $model --alias Qwen2.5-7B-Instruct --host 127.0.0.1 --port 17861 --jinja --reasoning off --ctx-size 8192 --device $device --n-gpu-layers 99 --parallel 1 --no-webui --log-disable
exit $LASTEXITCODE