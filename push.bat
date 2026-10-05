@echo off
chcp 65001 >nul
powershell -ExecutionPolicy Bypass -File "%~dp0push_to_github.ps1"
pause
