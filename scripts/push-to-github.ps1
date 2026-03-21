# GitHub 원격 연결 후 main 브랜치 push
param(
  [Parameter(Mandatory = $true)]
  [string]$OriginUrl
)

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$existing = git remote get-url origin 2>$null
if ($LASTEXITCODE -eq 0) {
  Write-Host "Updating existing origin -> $OriginUrl"
  git remote set-url origin $OriginUrl
} else {
  Write-Host "Adding origin -> $OriginUrl"
  git remote add origin $OriginUrl
}

Write-Host "Pushing main..."
git push -u origin main
Write-Host "Done."
