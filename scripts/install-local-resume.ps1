param([ValidateSet("All", "Docs", "Model")][string]$Component = "All", [switch]$UseModelMirror, [switch]$UseRuntimeMirror)
$ErrorActionPreference = "Stop"
$runtime = Join-Path $PSScriptRoot "../apps/api/data"
function Get-VerifiedFile($Url, $Path, $Hash) {
  if ((Test-Path -LiteralPath $Path) -and (Get-FileHash -LiteralPath $Path).Hash -eq $Hash) { return }
  & curl.exe --fail --location --retry 8 --retry-all-errors --continue-at - --speed-time 30 --speed-limit 1024 --connect-timeout 20 --max-time 1800 --output "$Path.part" $Url
  if ($LASTEXITCODE -ne 0 -or (Get-FileHash -LiteralPath "$Path.part").Hash -ne $Hash) {
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
  $revision = "bb5d59e06d9551d752d08b292a50eb208b07ab1f"
  $shards = @(
    @("qwen2.5-7b-instruct-q4_k_m-00001-of-00002.gguf", "dfce12e3862a5283ccfb88221b48480e58745165de856439950d0f22590580db"),
    @("qwen2.5-7b-instruct-q4_k_m-00002-of-00002.gguf", "539cf93f78e887edea1c04e2d7d8cdaca9d01dae9c9025bcb8accbe29df3d72a")
  )
  foreach ($shard in $shards) {
    $name = $shard[0]
    Get-VerifiedFile "https://$modelHost/Qwen/Qwen2.5-7B-Instruct-GGUF/resolve/$revision/$name" (Join-Path $models $name) $shard[1]
  }
  $llama = Join-Path $runtime "llama-vulkan"
  New-Item -ItemType Directory -Force $llama | Out-Null
  $zip = Join-Path $llama "llama-b12034-bin-win-vulkan-x64.zip"
  $runtimeUrl = "https://github.com/ggml-org/llama.cpp/releases/download/b12034/llama-b12034-bin-win-vulkan-x64.zip"
  if ($UseRuntimeMirror) { $runtimeUrl = "https://ghproxy.net/$runtimeUrl" }
  Get-VerifiedFile $runtimeUrl $zip "df6ab37942d02aeb8ab3de5984711ea866826a94d50f7a9c5960a0d18a9d4269"
  Expand-Archive -LiteralPath $zip -DestinationPath $llama -Force
}