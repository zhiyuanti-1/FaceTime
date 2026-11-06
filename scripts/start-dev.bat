@echo off
chcp 65001 >nul
setlocal
title Face 一键启动
set "FACE_LAUNCHER=%~f0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$text=[IO.File]::ReadAllText($env:FACE_LAUNCHER); $parts=$text -split '(?m)^# FACE_POWERSHELL\r?\n',2; & ([ScriptBlock]::Create($parts[1]))"
exit /b %errorlevel%
# FACE_POWERSHELL
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path (Split-Path $env:FACE_LAUNCHER)
Set-Location -LiteralPath $projectRoot

# 挂起创建后再加入作业，防止子进程在受控之前派生进程。
Add-Type -TypeDefinition @"
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
public sealed class FaceProcessJob : IDisposable {
    [StructLayout(LayoutKind.Sequential)]
    struct Limits {
        public long UserTime, JobTime;
        public uint Flags;
        public UIntPtr MinWorkingSet, MaxWorkingSet;
        public uint ActiveProcesses;
        public UIntPtr Affinity;
        public uint Priority, Scheduling;
    }
    [StructLayout(LayoutKind.Sequential)]
    struct IoCounters { public ulong ReadOps, WriteOps, OtherOps, ReadBytes, WriteBytes, OtherBytes; }
    [StructLayout(LayoutKind.Sequential)]
    struct ExtendedLimits {
        public Limits Basic;
        public IoCounters Io;
        public UIntPtr ProcessMemory, JobMemory, PeakProcessMemory, PeakJobMemory;
    }
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
    struct Startup {
        public int Size;
        public string Reserved, Desktop, Title;
        public uint X, Y, XSize, YSize, XChars, YChars, Fill, Flags;
        public ushort Show, ReservedSize;
        public IntPtr ReservedData, Input, Output, Error;
    }
    [StructLayout(LayoutKind.Sequential)]
    struct ProcessInfo { public IntPtr Process, Thread; public uint Id, ThreadId; }
    [DllImport("kernel32.dll", SetLastError=true)] static extern IntPtr CreateJobObject(IntPtr attributes, string name);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool SetInformationJobObject(IntPtr job, int kind, ref ExtendedLimits value, uint size);
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
    static extern bool CreateProcess(string app, System.Text.StringBuilder command, IntPtr processAttributes, IntPtr threadAttributes, bool inherit, uint flags, IntPtr environment, string directory, ref Startup startup, out ProcessInfo info);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);
    [DllImport("kernel32.dll", SetLastError=true)] static extern uint ResumeThread(IntPtr thread);
    [DllImport("kernel32.dll")] static extern bool TerminateProcess(IntPtr process, uint code);
    [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
    [DllImport("kernel32.dll")] static extern uint WaitForSingleObject(IntPtr handle, uint timeout);
    IntPtr job;
    readonly System.Collections.Generic.List<IntPtr> processes = new System.Collections.Generic.List<IntPtr>();
    public FaceProcessJob() {
        job = CreateJobObject(IntPtr.Zero, null);
        if (job == IntPtr.Zero) throw new Win32Exception();
        var limits = new ExtendedLimits();
        limits.Basic.Flags = 0x2000;
        if (!SetInformationJobObject(job, 9, ref limits, (uint)Marshal.SizeOf(typeof(ExtendedLimits)))) {
            Dispose(); throw new Win32Exception();
        }
    }
    public uint Start(string executable, string arguments, string directory) {
        var startup = new Startup { Size = Marshal.SizeOf(typeof(Startup)) };
        ProcessInfo info;
        var command = new System.Text.StringBuilder("\"" + executable + "\" " + arguments);
        if (!CreateProcess(executable, command, IntPtr.Zero, IntPtr.Zero, false, 4, IntPtr.Zero, directory, ref startup, out info))
            throw new Win32Exception();
        try {
            if (!AssignProcessToJobObject(job, info.Process)) throw new Win32Exception();
            if (ResumeThread(info.Thread) == UInt32.MaxValue) throw new Win32Exception();
            processes.Add(info.Process);
            return info.Id;
        } catch {
            TerminateProcess(info.Process, 1); CloseHandle(info.Process); throw;
        } finally { CloseHandle(info.Thread); }
    }
    public bool AllRunning() {
        foreach (var process in processes)
            if (WaitForSingleObject(process, 0) != 258) return false;
        return processes.Count > 0;
    }
    public void Dispose() {
        if (job != IntPtr.Zero) { CloseHandle(job); job = IntPtr.Zero; }
        foreach (var process in processes) CloseHandle(process);
        processes.Clear();
    }
}
"@

function Get-FreePort([int]$Base, [int]$Exclude = 0) {
    foreach ($port in $Base..([Math]::Min(65535, $Base + 20))) {
        if ($port -ne $Exclude -and !(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)) { return $port }
    }
    throw "端口 $Base 附近没有空闲端口"
}

function Show-ServiceAddresses($Entries) {
    Write-Host ''
    Write-Host '========== 全部服务已就绪 ==========' -ForegroundColor Green
    foreach ($entry in $Entries) {
        Write-Host ($entry.Name + '  端口 ' + $entry.Port + '  ' + $entry.Url)
    }
    Write-Host '提示词调试与接口文档共用后端端口。关闭此窗口或按 Ctrl+C 停止本次全部服务。'
    Write-Host '===================================='
}
$job = $null
try {
    if (!(Test-Path -LiteralPath 'node_modules')) { throw '请先执行 npm ci' }
    if (!(Test-Path -LiteralPath 'apps/api/.env')) { throw '请按 README 配置 apps/api/.env' }
    Get-Command node.exe -ErrorAction Stop | Out-Null
    Get-Command npm.cmd -ErrorAction Stop | Out-Null
    $settings = @{}
    foreach ($line in Get-Content -LiteralPath 'apps/api/.env') {
        if ($line -match '^\s*(API_PORT|WEB_PORT)\s*=\s*["'']?(\d+)["'']?\s*$') { $settings[$matches[1]] = [int]$matches[2] }
    }
    $apiBase = 3000
    $webBase = 5173
    if ($settings.ContainsKey('API_PORT')) { $apiBase = $settings.API_PORT }
    if ($settings.ContainsKey('WEB_PORT')) { $webBase = $settings.WEB_PORT }
    if ($apiBase -lt 1 -or $apiBase -gt 65535 -or $webBase -lt 1 -or $webBase -gt 65535) { throw 'API_PORT 或 WEB_PORT 超出有效范围' }
    $env:API_PORT = [string](Get-FreePort $apiBase)
    $env:WEB_PORT = [string](Get-FreePort $webBase ([int]$env:API_PORT))
    if (Get-NetTCPConnection -State Listen -LocalPort 17861 -ErrorAction SilentlyContinue) {
        throw '17861 已被其他模型实例占用。请关闭该实例后重新运行启动器。'
    }
    $model = Join-Path $projectRoot 'apps/api/data/models/qwen2.5-7b-instruct-q4_k_m-00001-of-00002.gguf'
    $server = Get-ChildItem -LiteralPath 'apps/api/data/llama-vulkan' -Filter llama-server.exe -Recurse -File | Select-Object -First 1
    if (!$server -or !(Test-Path -LiteralPath $model)) { throw '请先运行 scripts/install-local-resume.ps1 安装资源' }

    $job = New-Object FaceProcessJob
    # 每个进程共享当前窗口，作业句柄由启动器独占。
    $modelRunner = Join-Path $projectRoot 'scripts/start-local-resume.ps1'
    $job.Start((Get-Command powershell.exe).Source, ('-NoProfile -ExecutionPolicy Bypass -File "' + $modelRunner + '"'), $projectRoot) | Out-Null
    $job.Start($env:ComSpec, '/d /s /c "npm run dev"', $projectRoot) | Out-Null
    Write-Host '正在等待前端、后端和模型就绪，随后会汇总全部访问地址。'
    $entries = @(
        @{ Name = '主站'; Port = $env:WEB_PORT; Url = "http://127.0.0.1:$env:WEB_PORT/" }
        @{ Name = '后端健康检查'; Port = $env:API_PORT; Url = "http://127.0.0.1:$env:API_PORT/api/health" }
        @{ Name = '接口文档'; Port = $env:API_PORT; Url = "http://127.0.0.1:$env:API_PORT/doc.html" }
        @{ Name = 'OpenAPI JSON'; Port = $env:API_PORT; Url = "http://127.0.0.1:$env:API_PORT/v3/api-docs" }
        @{ Name = '提示词调试'; Port = $env:API_PORT; Url = "http://127.0.0.1:$env:API_PORT/debug/resume" }
        @{ Name = '本机模型健康检查'; Port = '17861'; Url = 'http://127.0.0.1:17861/health' }
    )
    $pending = @($entries)
    $deadline = (Get-Date).AddSeconds(180)
    while ($pending.Count -gt 0) {
        if (!$job.AllRunning()) { throw '有服务在启动期间退出，请查看上方错误。' }
        $pending = @(
            foreach ($entry in $pending) {
                $ready = $false
                try {
                    $response = Invoke-WebRequest -UseBasicParsing -Uri $entry.Url -TimeoutSec 1
                    $ready = $response.StatusCode -eq 200
                } catch [System.Net.WebException] {
                    # 服务启动期间连接失败，留到下一轮检查。
                    $ready = $false
                }
                if (!$ready) { $entry }
            }
        )
        if ($pending.Count -gt 0 -and (Get-Date) -gt $deadline) {
            throw ('启动超时，未就绪入口：' + (($pending | ForEach-Object { $_.Name + ' ' + $_.Url }) -join '，'))
        }
        if ($pending.Count -gt 0) { Start-Sleep -Milliseconds 500 }
    }
    Show-ServiceAddresses $entries
    while ($job.AllRunning()) { Start-Sleep -Milliseconds 500 }
    throw '有服务已退出，本次其他服务也将停止，请查看上方错误。'
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($job) { $job.Dispose(); $job = $null }
    Read-Host '按回车关闭' | Out-Null
    exit 1
} finally {
    if ($job) { $job.Dispose() }
}
