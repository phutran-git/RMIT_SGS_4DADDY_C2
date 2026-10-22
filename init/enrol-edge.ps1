# Opens the Tide enrolment link in a THROWAWAY Edge profile with Local Network Access checks off.
# Why: during Tide sign-up the enclave page (https://ork*.tideprotocol.com) must call your local
# TideCloak (http://localhost:8080/.../tidevouchers). Edge/Chrome block public->localhost calls,
# which shows up as "Error creating user account. Network request failed".
# The temporary profile ($env:TEMP\edge-tide-dev) keeps your normal Edge settings untouched.
# Usage (from the app root):  powershell -ExecutionPolicy Bypass -File init\enrol-edge.ps1 [username]
param([string]$User = "admin")

$bash = "C:\Program Files\Git\bin\bash.exe"
$link = (& $bash "$PSScriptRoot/new-link.sh" $User | Select-Object -Last 1).Trim()
if (-not $link.StartsWith("http")) { throw "Could not mint an enrolment link: $link" }

$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$profileDir = Join-Path $env:TEMP "edge-tide-dev"
& $edge "--user-data-dir=$profileDir" "--no-first-run" `
  "--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessRespectPreflightResults,BlockInsecurePrivateNetworkRequests" `
  $link
Write-Host "Opened enrolment link for '$User' in a temporary Edge profile ($profileDir)."
