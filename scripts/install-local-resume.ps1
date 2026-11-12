param([ValidateSet("All", "Docs", "Model")][string]$Component = "All", [switch]$UseModelMirror, [switch]$UseRuntimeMirror)
$ErrorActionPreference = "Stop"
$runtime = Join-Path $PSScriptRoot "../apps/api/data"
function Get-VerifiedFile($Url, $Path, $Hash) {
  if ((Test-Path -LiteralPath $Path) -and (Get-FileHash -LiteralPath $Path).Hash -eq $Hash) { return }
  $ProgressPreference = "SilentlyContinue"
  Invoke-WebRequest -UseBasicParsing -Uri $Url -OutFile "$Path.part" -TimeoutSec 1800
  if ((Get-FileHash -LiteralPath "$Path.part").Hash -ne $Hash) {
    throw "下载或 SHA-256 校验失败： $Path"
  }
  Move-Item -Force -LiteralPath "$Path.part" -Destination $Path
}
if ($Component -ne "Model") {
  $docs = Join-Path $runtime "knife4j"
  New-Item -ItemType Directory -Force $docs | Out-Null
  $jar = Join-Path $docs "knife4j.jar"
  Get-VerifiedFile "https://repo.maven.apache.org/maven2/com/github/xiaoymin/knife4j-openapi3-ui/4.5.0/knife4j-openapi3-ui-4.5.0.jar" $jar "5d50ec693a1ffd5cc3cdc8b924d9a937512fb91854b35c2edc97436f4debdd47"
  & tar.exe -xf $jar -C $docs META-INF/resources
  if ($LASTEXITCODE -ne 0) { throw "Knife4j 解压失败" }
}
if ($Component -ne "Docs") {
  $models = Join-Path $runtime "models"
  New-Item -ItemType Directory -Force $models | Out-Null
  $modelHost = if ($UseModelMirror) { "hf-mirror.com" } else { "huggingface.co" }
  $revision = "7dabda4d13d513e3e842b20f0d435c732f172cbe"
  $name = "qwen2.5-3b-instruct-q4_k_m.gguf"
  Get-VerifiedFile "https://$modelHost/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/$revision/$name" (Join-Path $models $name) "626b4a6678b86442240e33df819e00132d3ba7dddfe1cdc4fbb18e0a9615c62d"
  $llama = Join-Path $runtime "llama-cuda"
  New-Item -ItemType Directory -Force $llama | Out-Null
  $archives = @(
    @("llama-b12034-bin-win-cuda-12.4-x64.zip", "9ccf4900c6d41e0e27b58d2f6db190918c89c83e26a62565f325ae5f36a3c0d4"),
    @("cudart-llama-bin-win-cuda-12.4-x64.zip", "8c79a9b226de4b3cacfd1f83d24f962d0773be79f1e7b75c6af4ded7e32ae1d6")
  )
  foreach ($archive in $archives) {
    $zip = Join-Path $llama $archive[0]
    $runtimeUrl = "https://github.com/ggml-org/llama.cpp/releases/download/b12034/$($archive[0])"
    if ($UseRuntimeMirror) { $runtimeUrl = "https://ghproxy.net/$runtimeUrl" }
    Get-VerifiedFile $runtimeUrl $zip $archive[1]
    Expand-Archive -LiteralPath $zip -DestinationPath $llama -Force
  }
}
