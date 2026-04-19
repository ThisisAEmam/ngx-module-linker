@echo off
setlocal

rem Get the directory of this script. The ~dp0 includes a trailing backslash.
set "SCRIPT_DIR=%~dp0"

rem Remove the trailing backslash for a cleaner path
set "NODEVM_PATH=%SCRIPT_DIR:~0,-1%"

echo [nodevm-setup] Setting up PATH...
echo [nodevm-setup] This will add the nodevm tool and the active node version to your user PATH.

rem Using PowerShell to reliably check and set the environment variable
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    $nodevmToolPath = '%NODEVM_PATH%'; ^
    $nodevmCurrentPath = '%NODEVM_PATH%\current'; ^
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User'); ^
    $pathsToAdd = @(); ^
    if (-not ($userPath -like ('*' + $nodevmToolPath + '*'))) { $pathsToAdd += $nodevmToolPath; } ^
    if (-not ($userPath -like ('*' + $nodevmCurrentPath + '*'))) { $pathsToAdd += $nodevmCurrentPath; } ^
    if ($pathsToAdd.Count -gt 0) { ^
        if ([string]::IsNullOrEmpty($userPath)) { ^
            $newPath = $pathsToAdd -join ';'; ^
        } else { ^
            $newPath = ($pathsToAdd + $userPath) -join ';'; ^
        } ^
        [Environment]::SetEnvironmentVariable('Path', $newPath, 'User'); ^
        Write-Host ('[nodevm-setup] Added {0} to PATH successfully!' -f ($pathsToAdd -join ', ')) -ForegroundColor Green; ^
        Write-Host '[nodevm-setup] Please restart your terminal for changes to take effect.' -ForegroundColor Yellow; ^
    } else { ^
        Write-Host '[nodevm-setup] All required paths are already configured.' -ForegroundColor Green; ^
    }

echo [nodevm-setup] Setup complete!
pause
