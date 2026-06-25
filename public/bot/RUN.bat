@echo off
chcp 65001 >nul
echo ==========================================
echo   KasiSetelbot Startup
echo ==========================================
echo.

REM Check python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Install Python 3.11+
    pause
    exit /b 1
)

REM Check dependencies
echo Checking dependencies...
python -c "import telegram" >nul 2>&1
if errorlevel 1 (
    echo Installing python-telegram-bot...
    pip install python-telegram-bot==20.7 httpx python-dotenv
)

echo.
echo Starting KasiSetelbot...
echo Press Ctrl+C to stop
echo.
python bot.py

pause
