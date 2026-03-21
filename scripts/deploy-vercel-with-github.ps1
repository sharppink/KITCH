# GitHub 커밋(선택) → push 성공 후에만 Vercel 프로덕션 배포
# 사용:
#   .\scripts\deploy-vercel-with-github.ps1
#   .\scripts\deploy-vercel-with-github.ps1 -AutoCommit   # 미커밋 변경이 있으면 자동 add/commit
#
# 순서: (1) 작업 트리 확인 (2) git-push.ps1 (3) vercel deploy --prod
param(
  [switch]$AutoCommit,
  [string]$CommitMessage = "chore: sync before Vercel deploy"
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

function Fail([string]$Reason) {
  Write-Host ""
  Write-Host "[중단] $Reason" -ForegroundColor Red
  exit 1
}

# ── 1) 미커밋 변경 처리 ─────────────────────────────────
$dirty = (git status --porcelain 2>&1)
if ($LASTEXITCODE -ne 0) {
  Fail "git status 실패: $dirty"
}

if ($dirty) {
  if (-not $AutoCommit) {
    Write-Host "[중단] 커밋되지 않은 변경이 있습니다. 먼저 커밋하거나 -AutoCommit 을 붙이세요." -ForegroundColor Yellow
    Write-Host ""
    Write-Host $dirty
    Write-Host ""
    Write-Host "예: .\scripts\deploy-vercel-with-github.ps1 -AutoCommit"
    exit 1
  }
  Write-Host ">>> 자동 커밋 (-AutoCommit)..."
  git add -A
  $commitOut = git commit -m $CommitMessage 2>&1
  Write-Host $commitOut
  if ($LASTEXITCODE -ne 0) {
    Fail "git commit 실패. 메시지: $commitOut"
  }
}

# ── 2) GitHub push (git-push.ps1) ─────────────────────────
# git-push.ps1 의 exit 가 상위 세션을 끊지 않도록 별도 프로세스로 실행
Write-Host ""
Write-Host ">>> GitHub push..."
$pushScript = Join-Path $PSScriptRoot "git-push.ps1"
powershell -NoProfile -ExecutionPolicy Bypass -File $pushScript
if ($LASTEXITCODE -ne 0) {
  Fail "GitHub push 실패 (exit $($LASTEXITCODE)). package.json 의 repository.url, github-repo.url, GITHUB_REPO_URL, 인증(PAT/로그인)을 확인하세요."
}

# ── 3) Vercel ─────────────────────────────────────────────
Write-Host ""
Write-Host ">>> Vercel 프로덕션 배포..."
$npx = Get-Command npx -ErrorAction SilentlyContinue
if (-not $npx) {
  Fail "npx 를 찾을 수 없습니다. Node.js 를 설치했는지 확인하세요."
}

npx vercel deploy --prod --yes
if ($LASTEXITCODE -ne 0) {
  Fail "Vercel 배포 실패 (exit $($LASTEXITCODE)). 위쪽 npm/Vercel 로그를 확인하세요."
}

Write-Host ""
Write-Host "[완료] GitHub 반영 후 Vercel 배포까지 성공했습니다." -ForegroundColor Green
