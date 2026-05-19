@echo off
REM Auto-start backend and frontend for AI Waste Detection System
REM This script starts both the Python backend and the React frontend

echo.
echo ================================================
echo    AI Waste Detection - Starting System
echo ================================================
echo.

REM Start backend in a new window
echo [1/2] Starting backend server...
start "AI Detection Backend" cmd /k "cd /d %CD% && python backend.py"

REM Wait a moment for backend to start
timeout /t 3 /nobreak

REM Start frontend in another window
echo [2/2] Starting frontend...
start "React Admin Panel" cmd /k "cd /d %CD% && npm run dev:frontend"

echo.
echo ================================================
echo    ✅ System Started
echo ================================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:5173
echo.
pause
