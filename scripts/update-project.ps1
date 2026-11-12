$ErrorActionPreference = 'Stop'

function Get-UpdatePath([string]$ProjectRoot, [string]$RelativePath) {
  $base = [IO.Path]::GetFullPath($ProjectRoot).TrimEnd('\')
  $target = [IO.Path]::GetFullPath((Join-Path $base $RelativePath))
  if (!$target.StartsWith($base + '\', [StringComparison]::OrdinalIgnoreCase)) { throw '更新目标超出项目目录，已停止。' }
  $cursor = $target
  while ($cursor -and $cursor.Length -ge $base.Length) {
    if (Test-Path -LiteralPath $cursor) {
      if ((Get-Item -LiteralPath $cursor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) {
        throw '更新目标包含符号链接或目录联接，已停止，避免影响链接外的文件。'
      }
    }
    $cursor = Split-Path -Parent $cursor
  }
  return $target
}

function Get-ProjectProcesses([string]$ProjectRoot, [object[]]$Processes) {
  $base = [IO.Path]::GetFullPath($ProjectRoot).TrimEnd('\').Replace('\', '/')
  $owned = @{}
  foreach ($process in $Processes) {
    $command = ([string]$process.CommandLine).Replace('\', '/')
    $executable = ([string]$process.ExecutablePath).Replace('\', '/')
    $hasModules = $command.IndexOf($base + '/node_modules/', [StringComparison]::OrdinalIgnoreCase) -ge 0
    $isApi = $process.Name -eq 'node.exe' -and $hasModules -and $command.Contains('/tsx/') -and $command.Contains('src/main.ts')
    $isWeb = $process.Name -eq 'node.exe' -and $hasModules -and $command.Contains('/vite/bin/vite.js')
    $isModel = $process.Name -eq 'llama-server.exe' -and $executable.StartsWith($base + '/apps/api/data/llama-', [StringComparison]::OrdinalIgnoreCase)
    if ($isApi -or $isWeb -or $isModel) { $owned[[int]$process.ProcessId] = $process }
  }
  do {
    $added = $false
    foreach ($process in $Processes) {
      if (!$owned.ContainsKey([int]$process.ProcessId) -and $owned.ContainsKey([int]$process.ParentProcessId)) {
        $owned[[int]$process.ProcessId] = $process
        $added = $true
      }
    }
  } while ($added)
  return @($owned.Values)
}

function Stop-ProjectProcesses([string]$ProjectRoot) {
  $snapshot = @(Get-CimInstance Win32_Process)
  $owned = @(Get-ProjectProcesses $ProjectRoot $snapshot)
  Write-Host ("[2/6] 停止本项目开发和模型进程，共 " + $owned.Count + ' 个。')
  # 先停父进程，避免 watch 在子进程退出后重新拉起；每次核对创建时间，防止 PID 被复用。
  $remaining = @($owned)
  while ($remaining.Count -gt 0) {
    $ids = @($remaining | ForEach-Object { [int]$_.ProcessId })
    $parents = @($remaining | Where-Object { [int]$_.ParentProcessId -notin $ids })
    if ($parents.Count -eq 0) { throw '本项目进程关系异常，已停止更新。' }
    foreach ($process in $parents) {
      $current = Get-CimInstance Win32_Process -Filter ("ProcessId=" + [int]$process.ProcessId)
      if ($current -and $current.CreationDate -eq $process.CreationDate) {
        try { Stop-Process -Id $current.ProcessId -Force -ErrorAction Stop }
        catch {
          # 父进程退出可能已带走子进程；只有确认仍存活时才报告停止失败。
          if (Get-Process -Id $current.ProcessId -ErrorAction SilentlyContinue) { throw }
        }
      }
    }
    $parentIds = @($parents | ForEach-Object { [int]$_.ProcessId })
    $remaining = @($remaining | Where-Object { [int]$_.ProcessId -notin $parentIds })
  }
}

function Assert-ResourceTree([string]$Path) {
  $queue = New-Object 'System.Collections.Generic.Queue[string]'
  $queue.Enqueue($Path)
  while ($queue.Count -gt 0) {
    $item = Get-Item -LiteralPath $queue.Dequeue() -Force
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw '旧资源内部存在目录联接或符号链接，拒绝递归清理。' }
    if ($item.PSIsContainer) {
      foreach ($child in @(Get-ChildItem -LiteralPath $item.FullName -Force)) { $queue.Enqueue($child.FullName) }
    }
  }
}

function Remove-ObsoleteResources([string]$ProjectRoot) {
  # 用户授权的旧资源清理名单；不扫描或删除未知模型，不参与模型运行兼容。
  $obsolete = @(
    'apps/api/data/models/qwen2.5-7b-instruct-q4_k_m-00001-of-00002.gguf',
    'apps/api/data/models/qwen2.5-7b-instruct-q4_k_m-00002-of-00002.gguf',
    'apps/api/data/models/Qwen3.5-0.8B-Q4_K_M.gguf',
    'apps/api/data/llama-vulkan',
    'apps/api/data/llama-cuda-b12034',
    'apps/api/data/llama-cuda-b12034.zip',
    'apps/api/data/llama-cuda-official-b12034.zip',
    'apps/api/data/cudart-b12034.zip',
    'apps/api/data/models/qwen2.5-3b-instruct-q4_k_m.gguf.part',
    'apps/api/data/models/qwen2.5-3b-official.gguf.part'
  )
  $targets = @()
  foreach ($relative in $obsolete) {
    $path = Get-UpdatePath $ProjectRoot $relative
    if (Test-Path -LiteralPath $path) {
      Assert-ResourceTree $path
      $targets += $path
    }
  }
  Write-Host '[6/6] 新资源已验证，按以下白名单清理旧模型、旧运行库和下载残片：'
  foreach ($target in $targets) { Write-Host ('  ' + $target.Substring($ProjectRoot.TrimEnd('\').Length + 1)) }
  if ($targets.Count -eq 0) { Write-Host '  没有需要清理的旧资源。' }
  foreach ($target in $targets) {
    # 执行前再次校验绝对路径与链接边界；只在本项目已展示的具体目录内递归。
    $checked = Get-UpdatePath $ProjectRoot $target.Substring($ProjectRoot.TrimEnd('\').Length + 1)
    Assert-ResourceTree $checked
    if ((Get-Item -LiteralPath $checked -Force).PSIsContainer) { Remove-Item -LiteralPath $checked -Recurse -Force }
    else { Remove-Item -LiteralPath $checked -Force }
  }
}

function Test-UpdatedModel([string]$ProjectRoot) {
  $server = Get-UpdatePath $ProjectRoot 'apps/api/data/llama-cuda/llama-server.exe'
  $model = Get-UpdatePath $ProjectRoot 'apps/api/data/models/qwen2.5-3b-instruct-q4_k_m.gguf'
  $devices = @(& $server --list-devices 2>&1)
  if ($LASTEXITCODE -ne 0) { throw 'CUDA 运行库检查失败，请检查 NVIDIA 驱动。旧模型尚未删除。' }
  $device = $devices | Select-String '^\s*(CUDA\d+):.*NVIDIA' | Select-Object -First 1
  if (!$device) { throw '未找到可用的 NVIDIA CUDA 显卡。旧模型尚未删除。' }
  $listener = New-Object Net.Sockets.TcpListener([Net.IPAddress]::Loopback, 17861)
  try { $listener.Start() } catch { throw '17861 仍被其他程序占用，已停止；不会结束无法确认归属的进程。' } finally { $listener.Stop() }
  $arguments = @('--model', ('"' + $model + '"'), '--alias', 'Qwen2.5-3B-Instruct', '--host', '127.0.0.1', '--port', '17861', '--jinja', '--reasoning', 'off', '--ctx-size', '8192', '--device', $device.Matches[0].Groups[1].Value, '--n-gpu-layers', '99', '--parallel', '1', '--no-webui', '--log-disable')
  $probe = Start-Process -FilePath $server -ArgumentList $arguments -WindowStyle Hidden -PassThru
  try {
    $ready = $false
    $deadline = [DateTime]::UtcNow.AddSeconds(90)
    while ([DateTime]::UtcNow -lt $deadline) {
      $probe.Refresh()
      if ($probe.HasExited) { throw '新模型启动失败。旧模型尚未删除。' }
      try { $ready = (Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:17861/health' -TimeoutSec 2).StatusCode -eq 200 }
      catch { $ready = $false }
      if ($ready) { break }
      Start-Sleep -Milliseconds 300
    }
    if (!$ready) { throw '新模型启动超过 90 秒，已停止。旧模型尚未删除。' }
    $models = Invoke-RestMethod 'http://127.0.0.1:17861/v1/models' -TimeoutSec 5
    if ($models.data.id -notcontains 'Qwen2.5-3B-Instruct') { throw '启动的模型名称与当前版本不一致。' }
    $body = @{ model = 'Qwen2.5-3B-Instruct'; temperature = 0; max_tokens = 32; messages = @(@{ role = 'user'; content = '请输出 JSON：{"ok":true}' }); response_format = @{ type = 'json_schema'; json_schema = @{ name = 'probe'; strict = $true; schema = @{ type = 'object'; properties = @{ ok = @{ type = 'boolean'; const = $true } }; required = @('ok'); additionalProperties = $false } } } } | ConvertTo-Json -Depth 12 -Compress
    $reply = Invoke-RestMethod 'http://127.0.0.1:17861/v1/chat/completions' -Method Post -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec 60
    if ($reply.choices.Count -ne 1 -or $reply.choices[0].finish_reason -ne 'stop') { throw '新模型推理未正常结束。' }
    $result = $reply.choices[0].message.content | ConvertFrom-Json
    if ($result -isnot [pscustomobject] -or @($result.PSObject.Properties).Count -ne 1 -or $result.ok -isnot [bool] -or !$result.ok) { throw '新模型结构化输出验证失败。' }
  } finally {
    $probe.Refresh()
    if (!$probe.HasExited) { Stop-Process -Id $probe.Id -Force; $probe.WaitForExit(5000) | Out-Null }
  }
}

function Invoke-ProjectUpdate([string]$ProjectRoot) {
  Set-Location -LiteralPath $ProjectRoot
  $null = Get-UpdatePath $ProjectRoot 'apps/api/data'
  if (!(Test-Path -LiteralPath (Join-Path $ProjectRoot 'apps/api/.env') -PathType Leaf)) { throw '缺少本机 apps/api/.env，请先配置。不会覆盖或从 GitHub 下载真实配置。' }
  & node -e "const v=process.versions.node.split('.').map(Number);process.exit(v[0]>22||(v[0]===22&&(v[1]>13||(v[1]===13&&v[2]>=0)))?0:1)"
  if ($LASTEXITCODE -ne 0) { throw '需要 Node.js 22.13.0 或更高版本。' }
  Stop-ProjectProcesses $ProjectRoot
  Write-Host '[3/6] 按锁文件安装依赖……'
  & npm.cmd ci
  if ($LASTEXITCODE -ne 0) { throw 'npm ci 失败，旧模型尚未删除。' }
  Write-Host '[4/6] 安装并校验当前模型、CUDA 和接口文档资源……'
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $ProjectRoot 'scripts/install-local-resume.ps1') -Component All
  if ($LASTEXITCODE -ne 0) { throw '模型或运行资源安装失败，旧模型尚未删除。' }
  Write-Host '[5/6] 构建并验证模型……'
  & npm.cmd run build
  if ($LASTEXITCODE -ne 0) { throw '构建失败，旧模型尚未删除。' }
  & node --input-type=module -e "const {config}=await import('./apps/api/dist/config.js');const missing=['ADMIN_USERNAME','ADMIN_PASSWORD','ADMIN_OWNER_ID','DB_USER','DB_PASSWORD','DB_CONNECT_STRING','DB_SCHEMA'].filter(k=>!config[k]);if(missing.length){console.error('本机配置缺少：'+missing.join('、'));process.exit(1)}"
  if ($LASTEXITCODE -ne 0) { throw '请补齐现有本机配置后重试；没有改写 .env。' }
  Test-UpdatedModel $ProjectRoot
  Remove-ObsoleteResources $ProjectRoot
  Write-Host '更新完成，即将启动项目。配置和业务数据已保留；数据库结构未自动修改。' -ForegroundColor Green
}

# 允许点加载纯函数做隔离验证，直接运行时才执行真实安装和清理。
if ($MyInvocation.InvocationName -ne '.') {
  try { Invoke-ProjectUpdate (Split-Path -Parent $PSScriptRoot) }
  catch { Write-Host ("更新步骤失败：" + $_.Exception.Message) -ForegroundColor Red; exit 1 }
}
