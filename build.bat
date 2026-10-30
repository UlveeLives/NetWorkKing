@echo off
REM NetWorkKing - (c) 2026 Ulvi Badalov. All rights reserved. Proprietary - see LICENSE.
chcp 65001 >nul
cd /d "%~dp0"
echo [1/2] npm install ...
call npm install || goto :err
echo [2/2] Setup .exe yigilir ...
call npm run dist || goto :err
echo.
echo HAZIRDIR: dist\NetWorkKing-Setup-3.8.1.exe
start "" "%~dp0dist"
pause
exit /b 0
:err
echo XETA bas verdi. Yuxaridaki mesaji yoxla.
pause
exit /b 1
