@echo off
setlocal

echo [Main Setup] Starting the setup process...
echo.

echo --- Step 1: Checking and Installing Bun ---
call "%~dp0install-bun.bat"
echo.

echo --- Step 2: Setting up nodevm ---
echo NOTE: If bun was just installed, you may need to close this terminal,
echo open a new one, and run this script again.
echo.
pause

echo [Main Setup] Proceeding to configure nodevm PATH...
call "%~dp0setup-nodevm.bat"
echo.

echo [Main Setup] All steps complete.
pause
