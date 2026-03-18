@echo off
REM Run backend using venv python (Windows)
IF NOT EXIST ".venv\Scripts\python.exe" (
  echo Virtual environment not found. Run: python -m venv .venv
  exit /b 1
)
".venv\Scripts\python.exe" app.py
