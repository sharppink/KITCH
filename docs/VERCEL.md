# Vercel 배포 (KITCH 웹)

이 저장소는 **pnpm 모노레포**이며, Vercel에는 **Expo 웹 정적 빌드**(`artifacts/mobile/web-dist`)만 올라갑니다.

## 1. GitHub에 푸시

Vercel은 Git 저장소를 연결하는 방식이 가장 단순합니다.

## 2. Vercel에서 새 프로젝트

1. [Vercel Dashboard](https://vercel.com) → **Add New…** → **Project**
2. 저장소 Import
3. **Root Directory**: 저장소 루트(`KITCH-master`를 그대로 클론했다면 `.` 또는 비워 둠)
4. **Framework Preset**: `Other` (또는 자동 인식 시 무시 가능)
5. **Build Command** / **Output Directory**는 루트의 `vercel.json`이 지정합니다. (수동 입력 시 아래 참고)

## 3. 환경 변수 (필수)

클라이언트 번들에 API 주소가 박히므로 **빌드 전**에 설정합니다.

| 이름 | 설명 |
|------|------|
| `EXPO_PUBLIC_API_URL` | API 베이스 전체 URL (끝 `/api` 권장). 예: `https://api-server-xxx.vercel.app/api`. 루트 `vercel.json`의 `build.env`에 기본값이 들어 있을 수 있습니다. |
| `EXPO_PUBLIC_DOMAIN` | **API가 제공되는 호스트만** (프로토콜 없음). 예: `api.example.com` → 앱은 `https://api.example.com/api` 로 요청합니다. (`EXPO_PUBLIC_API_URL`이 없을 때만 사용) |
| `EXPO_PUBLIC_USE_REMOTE_API` | `1` 또는 `true` 이면 **로컬 웹**(`localhost`)에서도 `http://localhost:8080/api` 대신 Vercel 등 **원격 API**만 사용합니다. `artifacts/mobile/.env`에 두면 `expo start --web` 시 적용됩니다. |

로컬 개발처럼 API가 없으면 분석·시세 등이 동작하지 않습니다. API는 **Railway, Render, Fly.io** 등에 `artifacts/api-server`를 배포한 뒤, 그 도메인을 `EXPO_PUBLIC_DOMAIN`에 넣으면 됩니다.

**모바일(스토어) 프로덕션 빌드**는 기본적으로 `localhost`를 쓰지 않고, `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_DOMAIN`이 없으면 코드에 정의된 공개 API(Vercel `api-server`)로 요청합니다. 다른 사람 휴대폰에서도 동일하게 동작합니다.

> 같은 도메인에 API를 올리는 경우(리버스 프록시로 `/api` 제공)에도 위와 같이 **호스트 이름**만 넣으면 됩니다.

## 3.1 `workspace:*` / `EUNSUPPORTEDPROTOCOL` 오류

Vercel이 **npm**으로 설치하면 `workspace:*` 의존성을 해석하지 못합니다. 이 저장소는 **pnpm + 모노레포 루트의 `pnpm-lock.yaml`** 이 필요합니다.

- 루트 `vercel.json`의 `installCommand`는 **Corepack으로 pnpm을 활성화**한 뒤 `pnpm install`을 실행합니다.
- 프로젝트가 **Git 저장소 전체를 클론**하지 않고 소수 파일만 올리면(예: CLI로 하위 폴더만 업로드) 루트 lockfile이 없어 실패할 수 있습니다. **Git 연동**으로 저장소 루트에서 빌드하거나, CLI는 [api-server README](../artifacts/api-server/README.md)의 모노레포 루트 배포 방식을 따르세요.

## 4. 배포 명령 요약

- **Install**: `pnpm install`
- **Build**: `pnpm run vercel-build` (= `expo export --platform web`)
- **Output**: `artifacts/mobile/web-dist`

## 5. CLI로 배포

```bash
cd KITCH-master
pnpm install
npx vercel
```

프로덕션: `npx vercel --prod`

프로젝트는 대시보드에서 이름을 지정하면 됩니다. 저장소 루트의 `vercel.json`에 예전 방식의 `name` 필드는 넣지 않습니다(deprecated).

### 5.1 GitHub push 성공 후에만 Vercel CLI 실행

`pnpm deploy:vercel` 은 다음 순서로 동작합니다.

1. **미커밋 변경이 있으면 중단**하고, 먼저 커밋하거나 `-AutoCommit` 사용을 안내합니다.  
2. **`pnpm push:github`** 와 동일하게 GitHub에 push합니다. **실패하면 여기서 종료**하고 이유를 출력합니다.  
3. push가 성공한 경우에만 **`npx vercel deploy --prod --yes`** 를 실행합니다.

```powershell
pnpm deploy:vercel
```

미커밋 변경을 자동으로 커밋까지 하려면:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-vercel-with-github.ps1 -AutoCommit
```

## 6. PWA (홈 화면에 앱처럼 설치)

웹 빌드에는 다음이 포함됩니다.

- `public/manifest.json` — 앱 이름, 아이콘, `standalone`, 테마 색
- `public/sw.js` — 최소 서비스 워커(설치 조건 충족, 요청은 네트워크 우선으로 캐시 이슈 최소화)
- `public/logo192.png`, `public/logo512.png` — 현재는 `assets/images/icon.png` 복사본(필요 시 192·512px 전용 PNG로 교체 권장)

Chrome/Edge: 주소창의 **설치** 아이콘 또는 메뉴에서 “앱 설치”.  
iOS Safari: **공유 → 홈 화면에 추가**.

사용자에게 설치 방법을 안내하려면 배포 URL의 **`/install`** 페이지(예: `https://당신도메인/install`)를 공유하면 됩니다.

오프라인 캐시를 강화하려면 [Expo PWA 가이드](https://docs.expo.dev/guides/progressive-web-apps/)의 Workbox 절차를 `export:web` 이후 단계에 붙이면 됩니다.

## 6.1 커스텀 도메인으로 PWA 배포

1. **Vercel** → 웹 프로젝트 → **Settings** → **Domains** 에서 구입한 도메인을 추가하고, 안내에 따라 DNS(A/CNAME)를 연결합니다.
2. **Environment Variables**(Production)에 다음을 설정합니다.  
   - **`EXPO_PUBLIC_SITE_URL`** = `https://당신도메인` (끝 `/` 없음, `https` 권장)  
   루트 `vercel.json`의 `build.env`에 기본값이 있어도, **대시보드 값이 우선**합니다.
3. 환경 변수를 바꾼 뒤에는 **재배포**(Redeploy)해야 번들에 반영됩니다.
4. `expo-router`의 메타데이터용 `origin`이 이 URL과 맞춰지며, 같은 주소로 접속한 사용자는 **manifest / 서비스 워커**가 그 도메인 기준으로 동작합니다(API는 여전히 `EXPO_PUBLIC_API_URL`).

## 7. 주의

- 루트 `pnpm-workspace.yaml`의 `minimumReleaseAge` 때문에 **최근에 올라온 패키지**가 있으면 설치가 실패할 수 있습니다. 그때는 잠시 후 재시도하거나 정책을 조정하세요.
- **`.env`는 Git에 넣지 마세요.** Vercel **Environment Variables**에만 등록합니다.

## 8. API가 웹에서 안 붙을 때 (Failed to fetch / 서버에 연결할 수 없습니다)

`EXPO_PUBLIC_API_URL`이 가리키는 **api-server** Vercel 프로젝트에 **Deployment Protection**이 프로덕션까지 적용되면, 브라우저 `fetch`는 CORS 때문에 `Failed to fetch`로 실패합니다. **api-server** 프로젝트 → **Settings** → **Deployment Protection**에서 프로덕션 공개 여부를 확인하세요. 자세한 설명은 [artifacts/api-server/README.md](../artifacts/api-server/README.md) 의 해당 절을 참고하세요.
