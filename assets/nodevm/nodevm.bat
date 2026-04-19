@echo off
rem %~dp0 is the directory of this batch file.
bun run "%~dp0nodevm.ts" %*
