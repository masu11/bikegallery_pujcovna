@echo off
title Spusteni bikegallery_pujcovna
cd /d "C:\Marcel\GITHUB\bikegallery_pujcovna"

echo Kontrola a instalace novych npm balicku...
call npm install

echo.
echo Spusteni npm run dev...
echo ----------------------------------------
call npm run dev

pause
