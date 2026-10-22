# Windows helper: runs init/tcinit.sh with Git Bash, with jq (winget: jqlang.jq) on PATH.
# Usage (from the app root):  powershell -ExecutionPolicy Bypass -File init\run-init.ps1
$jqDir = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Directory -Filter "jqlang.jq*" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($jqDir) { $env:PATH = "$($jqDir.FullName);$env:PATH" }
$bash = "C:\Program Files\Git\bin\bash.exe"
if (-not (Test-Path $bash)) { throw "Git Bash not found at $bash" }
& $bash "$PSScriptRoot/tcinit.sh"
