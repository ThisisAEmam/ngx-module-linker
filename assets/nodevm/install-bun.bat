@echo off
setlocal

echo [bun-installer] Checking for bun...
where.exe bun >nul 2>nul
if %errorlevel% equ 0 (
    echo [bun-installer] bun.exe is already installed.
    goto:eof
)

echo [bun-installer] bun.exe not found. Attempting to install it now...
echo [bun-installer] If this fails, you may be behind a firewall.
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm bun.sh/install.ps1 | iex"

if %errorlevel% neq 0 (
    echo [bun-installer] Installation failed. Please see the error message above.
    echo [bun-installer] You may need to download and run the installer manually from a browser.
    goto:eof
)

echo [bun-installer] bun has been installed successfully.
echo [bun-installer] IMPORTANT: Please close this terminal and open a new one before running other scripts.
