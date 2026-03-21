# Git 계정과 GitHub 연동 (Windows)

## 자동 설정 스크립트

프로젝트 루트에서:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\git-account-setup.ps1
```

또는 `package.json`에 스크립트를 추가했다면 `pnpm git:account` 로 실행합니다.

### 문제 해결 (스크립트 오류)

PowerShell에서 `Read-Host "… (user.email) …"` 처럼 **큰따옴표 안에 `(user.email)`** 이 있으면, 괄호 안이 **명령**으로 해석되어 파서 오류가 날 수 있습니다. 이 프로젝트 스크립트는 **작은따옴표 + 영문 프롬프트**로 이를 피합니다. `user.name` / `user.email` 이 이미 설정돼 있으면 `Read-Host`는 실행되지 않습니다.

## 수동으로 할 일

### 1. Git Credential Manager (HTTPS)

```powershell
git config --global credential.helper manager
```

이후 `git push` 시 **브라우저**로 GitHub 로그인하거나, **Personal Access Token**을 비밀번호처럼 입력할 수 있습니다.

### 2. 커밋 작성자 정보

```powershell
git config --global user.name "표시 이름"
git config --global user.email "GitHub에 등록한 이메일"
```

### 3. GitHub CLI (선택)

```powershell
winget install GitHub.cli
gh auth login
```

### 4. Personal Access Token (HTTPS에서 비밀번호 대신)

1. GitHub → **Settings → Developer settings → Personal access tokens**  
2. **repo** 권한 포함해 토큰 생성  
3. `git push` 시 **Password** 칸에 토큰 붙여넣기  

### 5. 확인

```powershell
git config --global --list
```

---

연동 후에는 [GITHUB_PUSH.md](./GITHUB_PUSH.md)대로 `pnpm push:github` 하면 됩니다.
