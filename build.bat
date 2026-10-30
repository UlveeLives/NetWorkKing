@echo off
REM NetWorkKing - (c) 2026 Ulvi Badalov. All rights reserved. Proprietary - see LICENSE.
chcp 65001 >nul
cd /d "%~dp0"
echo [1/3] npm install ...
call npm install || goto :err
echo [2/3] Setup .exe yigilir ...
call npm run dist || goto :err
echo [3/3] portable qovlugu yenilenir (yeni ikonlu NetWorkKing.exe) ...
if exist "dist\win-unpacked\NetWorkKing.exe" (
  robocopy "dist\win-unpacked" "portable" /MIR /NFL /NDL /NJH /NJS /NP >nul
  if errorlevel 8 goto :err
)
echo.
echo HAZIRDIR: dist\NetWorkKing-Setup-3.9.5.exe
echo           portable\NetWorkKing.exe (qurasdirmadan isleyen versiya)
start "" "%~dp0dist"
pause
exit /b 0
:err
echo XETA bas verdi. Yuxaridaki mesaji yoxla.
pause
exit /b 1
