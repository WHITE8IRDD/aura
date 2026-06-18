@echo off
cd /d "%~dp0"
start "Aura Dev Server" cmd /c "npm run dev"
echo Aura launched in a separate window.
