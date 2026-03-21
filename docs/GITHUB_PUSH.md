# GitHub에 push 하기 (Windows)

로컬 커밋 후 **원격 저장소 URL**과 **인증**만 있으면 push 할 수 있습니다.

## 1. GitHub에서 저장소 만들기

- 아직 없으면 GitHub에서 **New repository** → 이름 예: `KITCH` → 생성  
- 저장소 페이지 → **Code** → **HTTPS** 주소 복사  
  예: `https://github.com/조직또는계정/KITCH.git`

## 2. 원격 URL 넣는 방법 (택 1)

### A. `package.json`에 고정 (팀·반복 push에 편함)

`package.json`의 `repository.url`을 본인 저장소로 바꿉니다.

```json
"repository": {
  "type": "git",
  "url": "https://github.com/본인계정또는조직/KITCH.git"
}
```

그다음:

```powershell
pnpm push:github
```

### B. 한 번에 인자로

```powershell
cd C:\Users\compro\Downloads\KITCH-master\KITCH-master
powershell -ExecutionPolicy Bypass -File .\scripts\git-push.ps1 -RepoUrl "https://github.com/조직또는계정/KITCH.git"
```

### C. 환경 변수

```powershell
$env:GITHUB_REPO_URL = "https://github.com/조직또는계정/KITCH.git"
powershell -ExecutionPolicy Bypass -File .\scripts\git-push.ps1
```

### D. `github-repo.url` 파일 (커밋 안 됨)

1. `github-repo.url.example` 을 복사해 **`github-repo.url`** 로 저장 (프로젝트 루트)  
2. 내용을 본인 저장소 HTTPS URL **한 줄**로 수정  
3. 실행:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\git-push.ps1
```

## 3. 인증 (Private 또는 첫 HTTPS push)

### Git Credential Manager (권장, Windows)

```powershell
git config --global credential.helper manager
```

이후 `git push` 시 브라우저로 GitHub 로그인할 수 있습니다.

### Personal Access Token (HTTPS)

1. GitHub → **Settings → Developer settings → Personal access tokens**  
2. 토큰 생성 후, 비밀번호 대신 **토큰**을 입력합니다.  
3. 또는 URL에 넣지 말고, 프롬프트에서 Username=GitHub 아이디, Password=토큰.

### GitHub CLI

```powershell
winget install GitHub.cli
gh auth login
```

## 4. 원격에 이미 커밋이 있는 경우 (README만 있는 저장소)

```powershell
git pull origin main --allow-unrelated-histories
# 충돌 나면 해결 후
git add .
git commit -m "merge: remote initial commit"
git push -u origin main
```

## 5. 수동으로만 할 때

```powershell
git remote add origin https://github.com/조직또는계정/KITCH.git
# 이미 있으면: git remote set-url origin https://github.com/조직또는계정/KITCH.git
git push -u origin main
```

## 6. 오류 참고

| 메시지 | 대응 |
|--------|------|
| `Repository not found` | URL 오타, 또는 저장소 없음, 또는 Private인데 인증 실패 |
| `Permission denied` | 토큰 권한 `repo`, 또는 올바른 계정으로 로그인 |
| `failed to push` | 원격에 다른 히스토리 → 위 4번 `pull --allow-unrelated-histories` |
