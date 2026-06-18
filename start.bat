@echo off
echo =========================================
echo  PRESCREVE-AI — Iniciando MVP v1.0
echo =========================================
cd /d "%~dp0frontend"
start cmd /k "npm run dev"
timeout /t 4 /nobreak >nul
start http://localhost:3000
echo.
echo Servidor iniciado em http://localhost:3000
echo Pressione qualquer tecla para fechar esta janela.
pause >nul
