# api-server 프로젝트의 Vercel Authentication(ssoProtection) 비활성화 (REST API)
# 사용: 로컬에 `vercel login` 된 상태. 토큰은 %APPDATA%\com.vercel.cli\Data\auth.json
$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$projFile = Join-Path $root "artifacts/api-server/.vercel/project.json"
if (-not (Test-Path $projFile)) { throw "없음: $projFile — api-server 연결 후 재시도." }
$p = Get-Content $projFile -Raw -Encoding UTF8 | ConvertFrom-Json
$teamId = $p.orgId
$projectId = $p.projectId
$authPath = Join-Path $env:APPDATA "com.vercel.cli\Data\auth.json"
if (-not (Test-Path $authPath)) { throw "Vercel CLI auth.json 없음. vercel login 실행 후 재시도." }
$token = (Get-Content $authPath -Raw | ConvertFrom-Json).token
$uri = "https://api.vercel.com/v9/projects/$projectId`?teamId=$teamId"
Invoke-RestMethod -Uri $uri -Method PATCH -Headers @{
  Authorization = "Bearer $token"
  "Content-Type"  = "application/json"
} -Body '{"ssoProtection":null}' | Out-Null
Write-Host "OK: ssoProtection disabled for api-server ($projectId)" -ForegroundColor Green
