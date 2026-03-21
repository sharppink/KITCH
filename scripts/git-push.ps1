# GitHub로 main 브랜치 push (원격 URL은 아래 중 하나로 지정)
#   - 환경 변수: $env:GITHUB_REPO_URL
#   - 프로젝트 루트 파일: github-repo.url (한 줄, .gitignore 됨)
#   - 매개변수: -RepoUrl
#
# Private 저장소: Git Credential Manager 또는 PAT 필요
#   git config --global credential.helper manager
param(
  [string]$RepoUrl = $env:GITHUB_REPO_URL
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

$urlFile = Join-Path $root "github-repo.url"
if (-not $RepoUrl -and (Test-Path $urlFile)) {
  $RepoUrl = (Get-Content $urlFile -Raw).Trim()
  if ($RepoUrl -match '^#|^\s*$') {
    $RepoUrl = $null
  }
}

if (-not $RepoUrl) {
  Write-Host ""
  Write-Host "[오류] GitHub 저장소 HTTPS URL이 없습니다." -ForegroundColor Yellow
  Write-Host ""
  Write-Host "  (1) 환경 변수:"
  Write-Host '      $env:GITHUB_REPO_URL = "https://github.com/계정/KITCH.git"'
  Write-Host ""
  Write-Host "  (2) 파일: github-repo.url.example 을 복사해 github-repo.url 로 저장 후 URL 한 줄 수정"
  Write-Host ""
  Write-Host '  (3) 인자: .\scripts\git-push.ps1 -RepoUrl "https://github.com/계정/KITCH.git"'
  Write-Host ""
  exit 1
}

if ($RepoUrl -match 'YOUR_|PLACEHOLDER|example\.com') {
  Write-Host "[오류] URL을 실제 GitHub 저장소 주소로 바꿔 주세요." -ForegroundColor Red
  exit 1
}

$RepoUrl = $RepoUrl.Trim()

$existing = git remote get-url origin 2>$null
if ($LASTEXITCODE -eq 0) {
  if ($existing -ne $RepoUrl) {
    Write-Host "origin 변경: $existing -> $RepoUrl"
    git remote set-url origin $RepoUrl
  } else {
    Write-Host "origin OK: $RepoUrl"
  }
} else {
  Write-Host "origin 추가: $RepoUrl"
  git remote add origin $RepoUrl
}

Write-Host ""
Write-Host "git push -u origin main 실행 중..."
git push -u origin main
Write-Host ""
Write-Host "완료." -ForegroundColor Green
