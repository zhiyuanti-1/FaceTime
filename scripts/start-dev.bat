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
call :select_api_port
if errorlevel 1 goto api_port_error
call :select_web_port
if errorlevel 1 goto web_port_error
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
goto failed
:api_port_error
call :say api_port_error
goto failed
:web_port_error
call :say web_port_error
:failed
pause
exit /b 1

:select_api_port
set "FACE_PORT_CANDIDATE="
for /f "delims=" %%P in ('node --env-file-if-exists=apps/api/.env -e "const port=Number(process.env.API_PORT || 3000); if(Number.isInteger(port) && port>=1 && port<=65535) console.log(port)" 2^>nul') do set "FACE_PORT_CANDIDATE=%%P"
if not defined FACE_PORT_CANDIDATE exit /b 1

:probe_api_port
if %FACE_PORT_CANDIDATE% gtr 65535 exit /b 1
if %FACE_PORT_CANDIDATE% equ 5173 goto next_api_port
if %FACE_PORT_CANDIDATE% equ 17861 goto next_api_port
node -e "const server=require('node:net').createServer(); server.on('error',error=>{process.exitCode=['EADDRINUSE','EACCES'].includes(error.code)?1:2;}); server.listen(Number(process.env.FACE_PORT_CANDIDATE),'127.0.0.1',()=>server.close());"
if errorlevel 2 exit /b 1
if errorlevel 1 goto next_api_port
set "API_PORT=%FACE_PORT_CANDIDATE%"
set "FACE_API_PROXY_PORT=%FACE_PORT_CANDIDATE%"
exit /b 0

:next_api_port
set /a FACE_PORT_CANDIDATE+=1
goto probe_api_port

:select_web_port
set "FACE_WEB_CANDIDATE="
for /f "delims=" %%P in ('node --env-file-if-exists=apps/api/.env -e "const port=Number(process.env.WEB_PORT || 5173); if(Number.isInteger(port) && port>=1 && port<=65535) console.log(port)" 2^>nul') do set "FACE_WEB_CANDIDATE=%%P"
if not defined FACE_WEB_CANDIDATE exit /b 1

:probe_web_port
if %FACE_WEB_CANDIDATE% gtr 65535 exit /b 1
if "%FACE_WEB_CANDIDATE%"=="%API_PORT%" goto next_web_port
if %FACE_WEB_CANDIDATE% equ 17861 goto next_web_port
node -e "const server=require('node:net').createServer(); server.on('error',error=>{process.exitCode=['EADDRINUSE','EACCES'].includes(error.code)?1:2;}); server.listen(Number(process.env.FACE_WEB_CANDIDATE),'127.0.0.1',()=>server.close());"
if errorlevel 2 exit /b 1
if errorlevel 1 goto next_web_port
set "WEB_PORT=%FACE_WEB_CANDIDATE%"
exit /b 0

:next_web_port
set /a FACE_WEB_CANDIDATE+=1
goto probe_web_port

:say
set "FACE_START_MESSAGE=%~1"
powershell.exe -NoProfile -NonInteractive -Command "$prefix = 'rem @' + $env:FACE_START_MESSAGE + ' '; foreach ($line in [IO.File]::ReadAllLines($env:FACE_START_BAT, [Text.Encoding]::UTF8)) { if ($line.StartsWith($prefix)) { Write-Host $line.Substring($prefix.Length).Replace('{API_PORT}', [string]$env:API_PORT).Replace('{WEB_PORT}', [string]$env:WEB_PORT) } }"
exit /b

rem @installing 正在按 package-lock.json 安装依赖，请等待……
rem @launch 正在启动 FaceTime 前端、后端和本地模型……
rem @launch 前端地址：http://127.0.0.1:{WEB_PORT}/
rem @launch 后端地址：http://127.0.0.1:{API_PORT}/
rem @launch 提示词调试地址：http://127.0.0.1:{API_PORT}/debug/resume
rem @launch 简历读取和保存需要 Oracle 实例和监听都已启动。
rem @launch 请保留此窗口，停止服务请按 Ctrl+C。
rem @launch 前端和后端端口占用时会自动顺延，以上地址为实际端口。若本地模型端口 17861 冲突，请关闭旧启动窗口。
rem @oracle_offline 本机默认 Oracle 监听端口 1521 未响应。如果简历库返回 503，请启动 Oracle 实例和监听后重试。
rem @launch_error 启动或运行失败，请查看上方错误信息。
rem @stopped 服务已停止。
rem @directory_error 无法进入项目目录，请将本脚本保留在项目 scripts 目录内。
rem @node_error 未找到 Node.js，请安装 Node.js 22.13.0 或更高版本后重新打开本脚本。
rem @npm_error 未找到 npm，请检查 Node.js 安装及 PATH 环境变量。
rem @version_error Node.js 版本不满足要求，需要 22.13.0 或更高版本。
rem @install_error 依赖安装失败，请检查上方网络或文件权限错误后重试。
rem @api_port_error 无法选定后端端口，请检查 API_PORT 或本机端口占用情况。
rem @web_port_error 无法选定前端端口，请检查 WEB_PORT 或本机端口占用情况。
