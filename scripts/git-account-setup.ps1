# Windows에서 Git ↔ GitHub(HTTPS) 연동 기본 설정
# - Git Credential Manager: 브라우저로 GitHub 로그인 가능
# - user.name / user.email 이 없으면 입력 요청
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== Git 계정·GitHub 연동 (Windows) ===" -ForegroundColor Cyan
Write-Host ""

# 1) Credential Manager (HTTPS push 시 브라우저 로그인)
git config --global credential.helper manager
Write-Host "OK: credential.helper = manager (Git Credential Manager)" -ForegroundColor Green

# 2) 커밋에 쓸 이름·이메일
$name = git config --global user.name 2>$null
$email = git config --global user.email 2>$null

if ([string]::IsNullOrWhiteSpace($name)) {
  # 괄호 안 user.name 이 PowerShell에서 명령으로 해석되지 않도록 작은따옴표 사용
  $name = Read-Host 'Git user.name (display name for commits)'
  if (-not [string]::IsNullOrWhiteSpace($name)) {
    git config --global user.name $name
    Write-Host "OK: user.name = $name" -ForegroundColor Green
  }
} else {
  Write-Host "OK: user.name = $name" -ForegroundColor Green
}

if ([string]::IsNullOrWhiteSpace($email)) {
  $email = Read-Host 'GitHub user.email (same as GitHub account email)'
  if (-not [string]::IsNullOrWhiteSpace($email)) {
    git config --global user.email $email
    Write-Host "OK: user.email = $email" -ForegroundColor Green
  }
} else {
  Write-Host "OK: user.email = $email" -ForegroundColor Green
}

# 3) GitHub CLI (선택)
$gh = Get-Command gh -ErrorAction SilentlyContinue
if ($gh) {
  Write-Host ""
  Write-Host "GitHub CLI(gh)가 있습니다. 로그인하려면 터미널에서 실행하세요:" -ForegroundColor Yellow
  Write-Host "  gh auth login" -ForegroundColor White
} else {
  Write-Host ""
  Write-Host "(선택) GitHub CLI 설치: winget install GitHub.cli" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "다음 단계: 저장소 URL을 package.json 의 repository.url 에 넣고" -ForegroundColor Cyan
Write-Host "  pnpm push:github" -ForegroundColor White
Write-Host ""
