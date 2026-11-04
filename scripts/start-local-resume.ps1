$ErrorActionPreference = "Stop"
$runtime = Join-Path $PSScriptRoot "../apps/api/data"
$server = Get-ChildItem -Path (Join-Path $runtime "llama") -Filter "llama-server.exe" -Recurse -File | Select-Object -First 1
$model = Join-Path $runtime "models/Qwen3.5-0.8B-Q4_K_M.gguf"
if (!$server -or !(Test-Path -LiteralPath $model)) { throw "Run scripts/install-local-resume.ps1 -Component Model first" }
& $server.FullName --model $model --alias face-resume-qwen --host 127.0.0.1 --port 17861 --jinja --chat-template-kwargs '{"enable_thinking":false}' --parallel 1 --no-webui --log-disable
exit $LASTEXITCODE
