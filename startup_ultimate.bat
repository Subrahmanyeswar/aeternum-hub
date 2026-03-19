@echo off
TITLE AETERNUM HUB - GPU + LLM
COLOR 0A

set BASE_DIR=C:\Users\SUBBU\Downloads\Aeternum Hub GPU
set VENV_SCRIPTS=%BASE_DIR%\venv_gpu\Scripts

echo ====================================================
echo    AETERNUM HUB - GPU + LLM ANALYSIS
echo ====================================================

:: Check Tailscale
echo [0/6] Checking Tailscale...
tailscale ip -4 > nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Tailscale not running!
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('tailscale ip -4') do set TAIL_IP=%%i
echo [OK] Tailscale IP: %TAIL_IP%

:: Check GPU
echo [1/6] Checking GPU...
"%VENV_SCRIPTS%\python.exe" -c "import torch; print(f'GPU: {torch.cuda.is_available()}'); print(f'Name: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"None\"}')"

:: Start Backend
echo [2/6] Backend API...
start "Backend" /d "%BASE_DIR%" cmd /k "call venv_gpu\Scripts\activate.bat && uvicorn backend.main:app --host 0.0.0.0 --port 8000"
timeout /t 3 /nobreak >nul

:: Start Camera
echo [3/6] Camera Worker...
start "Camera" /d "%BASE_DIR%" cmd /k "call venv_gpu\Scripts\activate.bat && python -m backend.camera_worker"
timeout /t 2 /nobreak >nul

:: Start AI Worker
echo [4/6] AI Worker...
start "AI_Worker" /d "%BASE_DIR%" cmd /k "call venv_gpu\Scripts\activate.bat && python -m backend.ai_worker"
timeout /t 2 /nobreak >nul

:: Start Video Processor (LLM)
echo [5/6] LLM Video Processor...
start "Video_Processor" /min cmd /k "call venv_gpu\Scripts\activate.bat && python -m backend.video_processor"
timeout /t 2 /nobreak >nul

:: Start Frontend
echo [6/6] Dashboard...
start "Frontend" /d "%BASE_DIR%\frontend" cmd /k "npm run dev"

echo.
echo ====================================================
echo              SYSTEM LIVE + LLM READY
echo ====================================================
echo ON YOUR PC: http://localhost:3000
echo ON MOBILE: http://%TAIL_IP%:3000
echo ====================================================
pause






















































































