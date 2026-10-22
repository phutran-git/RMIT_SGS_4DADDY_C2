# Opens the app in the same throwaway Edge profile as init\enrol-edge.ps1 (Local Network Access
# checks off), because Tide's sign-in page must also reach the local TideCloak during login.
# Usage: powershell -ExecutionPolicy Bypass -File init\open-app-edge.ps1 [profileName]
# Use a different profileName (e.g. "lab") to sign in as a second user side by side.
param([string]$ProfileName = "edge-tide-dev", [string]$Url = "http://localhost:3000")

$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$profileDir = Join-Path $env:TEMP $ProfileName
& $edge "--user-data-dir=$profileDir" "--no-first-run" "--disable-popup-blocking" `
  "--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessRespectPreflightResults,BlockInsecurePrivateNetworkRequests" `
  $Url
Write-Host "Opened $Url in temporary Edge profile $profileDir"
