@echo off
echo ========================================
echo   Career Document Assistant starting...
echo ========================================
cd /d "%~dp0"

if not exist ".env.local" (
    echo .env.local not found.
    echo Copying .env.local.example to .env.local ...
    echo Please set your API key in .env.local.
    echo.
    copy .env.local.example .env.local
    echo Opening .env.local in Notepad...
    notepad .env.local
)

if not exist "node_modules" (
    echo Installing packages...
    npm install
)

echo.
echo Open http://localhost:3000 in your browser
echo Press Ctrl+C to stop
echo.
npm run dev
