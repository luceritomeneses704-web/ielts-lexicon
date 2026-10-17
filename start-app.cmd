@echo off
chcp 65001 > nul
title IELTS Lexicon 雅思极简词典
set NODE_ENV=production

cd /d D:\ielts-lexicon

echo ============================================
echo   IELTS Lexicon 雅思极简词典
echo ============================================
echo.

REM 1. 服务已在运行则直接打开浏览器
curl -s -o nul http://localhost:3000/api/health >nul 2>&1
if not errorlevel 1 (
  echo 服务已在运行，直接打开浏览器...
  start http://localhost:3000
  echo.
  echo 浏览器已打开。服务器由另一个黑色窗口提供，
  echo 关闭那个窗口即可停止服务。
  pause >nul
  exit /b
)

REM 2. 端口被占但无响应 = 残留进程，先清理
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r ":3000 .*LISTENING"') do (
  echo 清理无响应的旧服务进程 ^(PID %%p^)...
  taskkill /f /pid %%p >nul 2>&1
  timeout /t 1 /nobreak >nul
)

REM 3. 启动服务器（生产模式，预构建资源，约2秒就绪）
echo 正在启动服务器...
start "" /b "C:\Users\YLK\.workbuddy\binaries\node\versions\22.22.2\node.exe" "D:\ielts-lexicon\node_modules\tsx\dist\cli.mjs" server.ts

REM 4. 等待服务就绪（最多60秒）
echo 等待服务就绪（最多60秒）...
for /l %%i in (1,1,60) do (
  timeout /t 1 /nobreak >nul
  curl -s -o nul http://localhost:3000/api/health >nul 2>&1 && goto :ready
)

echo.
echo ============================================
echo   启动失败：服务器60秒内未就绪。
echo   请将本窗口截图发给助手处理。
echo ============================================
pause >nul
exit /b

:ready
start http://localhost:3000
echo.
echo ============================================
echo   启动成功！浏览器已打开:
echo   http://localhost:3000
echo.
echo   关闭此窗口 = 停止词典服务
echo ============================================
pause >nul
