@echo off
title Aeternum Hub - GPU Mode

echo ================================================
echo        AETERNUM HUB - GPU ACCELERATED
echo ================================================
echo.

REM Activate virtual environment
call venv_gpu\Scripts\activate.bat

echo [1/6] Starting Backend API...
start "Backend_API" /min cmd /k "call venv_gpu\Scripts\activate.bat && uvicorn backend.main:app --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak > nul

echo [2/6] Starting Camera Worker...
start "Camera_Worker" /min cmd /k "call venv_gpu\Scripts\activate.bat && python -m backend.camera_worker"

timeout /t 2 /nobreak > nul

echo [3/6] Starting AI Worker...
start "AI_Worker" cmd /k "call venv_gpu\Scripts\activate.bat && python -m backend.ai_worker"

timeout /t 3 /nobreak > nul

echo [4/6] Starting Video Processor...
start "Video_Processor" /min cmd /k "call venv_gpu\Scripts\activate.bat && python -m backend.video_processor"

timeout /t 2 /nobreak > nul

echo [5/6] Starting Frontend...
cd frontend
start "Frontend" cmd /k "npm run dev"
cd ..

timeout /t 3 /nobreak > nul

echo.
echo ================================================
echo         ALL SERVICES STARTED
echo ================================================
echo.
echo Backend API:       http://localhost:8000
echo Frontend:          http://localhost:3000
echo Tailscale Access:  http://100.125.216.4:3000
echo.
echo Press any key to open dashboard...
pause > nul

start http://localhost:3000

echo.
echo System is running. Close this window to stop all services.
pause