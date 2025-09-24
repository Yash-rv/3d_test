Write-Host "Starting local web server on http://localhost:8000"
Write-Host "Press Ctrl+C to stop the server"

# Change to the current directory
$currentPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $currentPath

# Start a Python HTTP server
python -m http.server 8000