param([ValidateSet("All", "Docs", "Model")][string]$Component = "All", [switch]$UseModelMirror)
$ErrorActionPreference = "Stop"
$runtime = Join-Path $PSScriptRoot "../apps/api/data"
function Get-VerifiedFile($Url, $Path, $Hash) {
  if ((Test-Path -LiteralPath $Path) -and (Get-FileHash -LiteralPath $Path).Hash -eq $Hash) { return }
  & curl.exe --fail --location --retry 2 --retry-all-errors --connect-timeout 20 --max-time 300 --output "$Path.part" $Url
  if ($LASTEXITCODE -ne 0 -or (Get-FileHash -LiteralPath "$Path.part").Hash -ne $Hash) {
    throw "Download or SHA-256 verification failed: $Path"
  }
  Move-Item -Force -LiteralPath "$Path.part" -Destination $Path
}
if ($Component -ne "Model") {
  $docs = Join-Path $runtime "knife4j"
  New-Item -ItemType Directory -Force $docs | Out-Null
  $jar = Join-Path $docs "knife4j.jar"
  Get-VerifiedFile "https://repo.maven.apache.org/maven2/com/github/xiaoymin/knife4j-openapi3-ui/4.5.0/knife4j-openapi3-ui-4.5.0.jar" $jar "5d50ec693a1ffd5cc3cdc8b924d9a937512fb91854b35c2edc97436f4debdd47"
  & tar.exe -xf $jar -C $docs META-INF/resources
  if ($LASTEXITCODE -ne 0) { throw "Knife4j extraction failed" }
}
if ($Component -ne "Docs") {
  $models = Join-Path $runtime "models"
  New-Item -ItemType Directory -Force $models | Out-Null
  $name = "Qwen3.5-0.8B-Q4_K_M.gguf"
  $modelHost = if ($UseModelMirror) { "hf-mirror.com" } else { "huggingface.co" }
  Get-VerifiedFile "https://$modelHost/unsloth/Qwen3.5-0.8B-GGUF/resolve/6ab461498e2023f6e3c1baea90a8f0fe38ab64d0/$name" (Join-Path $models $name) "bd258782e35f7f458f8aced1adc053e6e92e89bc735ba3be89d38a06121dc517"
}

if ($Component -ne "Docs") {
  $llama = Join-Path $runtime "llama"
  New-Item -ItemType Directory -Force $llama | Out-Null
  $zip = Join-Path $llama "llama-b12034-bin-win-cpu-x64.zip"
  Get-VerifiedFile "https://github.com/ggml-org/llama.cpp/releases/download/b12034/llama-b12034-bin-win-cpu-x64.zip" $zip "16c38cd9ff7487bf118a37808784245a2d639d844110f21fe9b373aaa40ff511"
  Expand-Archive -LiteralPath $zip -DestinationPath $llama -Force
}
