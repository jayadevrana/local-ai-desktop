$envFile = Join-Path $PSScriptRoot "..\..\agents\windows-executor\.env.example"
Write-Host "Load variables from $envFile, create a Python 3.11 virtualenv, install the package, then run:"
Write-Host "python -m src.main"
