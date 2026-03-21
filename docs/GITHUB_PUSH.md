# GitHub에 첫 push 하기

로컬에는 이미 커밋이 있습니다. **원격 저장소 URL**만 있으면 연결할 수 있습니다.

## 1. GitHub에서 저장소 URL 복사

저장소 페이지 → **Code** → **HTTPS** (예: `https://github.com/조직또는계정/KITCH.git`)

## 2. 원격 추가 후 push

```powershell
cd C:\Users\compro\Downloads\KITCH-master\KITCH-master

git remote add origin https://github.com/조직또는계정/KITCH.git
# 이미 origin이 있으면: git remote set-url origin https://github.com/조직또는계정/KITCH.git

git push -u origin main
```

Private 저장소는 **로그인** 또는 **Personal Access Token**이 필요합니다. 브라우저 창이 뜨면 승인하면 됩니다.

## 3. 스크립트로 한 번에 (선택)

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\push-to-github.ps1 -OriginUrl "https://github.com/조직또는계정/KITCH.git"
```

## 4. 원격에 이미 커밋이 있는 경우

GitHub에서 README로 만들었다면:

```powershell
git pull origin main --allow-unrelated-histories
# 충돌 해결 후
git push -u origin main
```
