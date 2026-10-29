@echo off
rem NetWorkKing — acilis ekrani testi (yalniz test; proqrami acmir).
rem Birinci: seffaf, cercivesiz. Ikinci: kart uzerinde.
cd /d "%~dp0"
if not exist node_modules\electron ( echo Evvelce build.bat-i bir defe isledin ^(electron yuklensin^). & pause & exit /b )
call npx electron branding\splash-test\main.js
call npx electron branding\splash-test\main.js card
