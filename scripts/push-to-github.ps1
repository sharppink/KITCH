# 하위 호환: scripts/git-push.ps1 로 위임
param([Parameter(Mandatory = $true)][string]$OriginUrl)
& (Join-Path $PSScriptRoot "git-push.ps1") -RepoUrl $OriginUrl
