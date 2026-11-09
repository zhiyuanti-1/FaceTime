@echo off
setlocal
chcp 65001 >nul
title FaceTime
set "FACE_START_BAT=%~f0"
cd /d "%~dp0.." || goto directory_error

where node >nul 2>nul
if errorlevel 1 goto node_error
where npm >nul 2>nul
if errorlevel 1 goto npm_error

node -e "const v=process.versions.node.split('.').map(Number);process.exit(v[0]>22||(v[0]===22&&(v[1]>13||(v[1]===13&&v[2]>=0)))?0:1)"
if errorlevel 1 goto version_error

if exist "node_modules\.bin\concurrently.cmd" if exist "node_modules\.bin\vite.cmd" if exist "node_modules\.bin\tsx.cmd" goto launch
call :say installing
call npm ci
if errorlevel 1 goto install_error

:launch
echo.
call :say launch
node -e "const s=require('node:net').connect(1521,'127.0.0.1');s.setTimeout(800);s.once('connect',()=>s.end());s.once('error',()=>process.exit(1));s.once('timeout',()=>process.exit(1));"
if errorlevel 1 call :say oracle_offline
echo.
call npm run dev:local
set "FACE_EXIT_CODE=%ERRORLEVEL%"
echo.
if not "%FACE_EXIT_CODE%"=="0" call :say launch_error
call :say stopped
pause
exit /b %FACE_EXIT_CODE%

:directory_error
call :say directory_error
goto failed
:node_error
call :say node_error
goto failed
:npm_error
call :say npm_error
goto failed
:version_error
call :say version_error
node --version
goto failed
:install_error
call :say install_error
:failed
pause
exit /b 1

:say
set "FACE_START_MESSAGE=%~1"
powershell.exe -NoProfile -NonInteractive -Command "$prefix = 'rem @' + $env:FACE_START_MESSAGE + ' '; foreach ($line in [IO.File]::ReadAllLines($env:FACE_START_BAT, [Text.Encoding]::UTF8)) { if ($line.StartsWith($prefix)) { Write-Host $line.Substring($prefix.Length) } }"
exit /b

rem @installing 正在按 package-lock.json 安装依赖，请等待……
rem @launch 正在启动 FaceTime 前端、后端和本地模型……
rem @launch 前端地址：http://127.0.0.1:5173/
rem @launch 后端地址：以启动日志为准，默认 http://127.0.0.1:3000/
rem @launch 提示词调试地址：见后端启动日志，默认 http://127.0.0.1:3000/debug/resume
rem @launch 简历读取和保存需要 Oracle 实例和监听都已启动。
rem @launch 请保留此窗口，停止服务请按 Ctrl+C。
rem @launch 如果提示端口占用，请先关闭之前运行本项目的启动窗口。
rem @oracle_offline 本机默认 Oracle 监听端口 1521 未响应。如果简历库返回 503，请启动 Oracle 实例和监听后重试。
rem @launch_error 启动或运行失败，请查看上方错误信息。
rem @stopped 服务已停止。
rem @directory_error 无法进入项目目录，请将本脚本保留在项目 scripts 目录内。
rem @node_error 未找到 Node.js，请安装 Node.js 22.13.0 或更高版本后重新打开本脚本。
rem @npm_error 未找到 npm，请检查 Node.js 安装及 PATH 环境变量。
rem @version_error Node.js 版本不满足要求，需要 22.13.0 或更高版本。
rem @install_error 依赖安装失败，请检查上方网络或文件权限错误后重试。
