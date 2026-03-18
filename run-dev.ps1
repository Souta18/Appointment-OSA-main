# Run the Flask backend using the repository virtual environment.
# Usage: From PowerShell, run:
#   .\run-dev.ps1

$venv = Join-Path $PSScriptRoot ".venv\Scripts\Activate.ps1"
if (Test-Path $venv) {
    & $venv
} else {
    Write-Error "Virtual environment not found at $venv. Please create it with: python -m venv .venv"
    exit 1
}

python app.py
