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

## 6. PWA (홈 화면에 앱처럼 설치)

웹 빌드에는 다음이 포함됩니다.

- `public/manifest.json` — 앱 이름, 아이콘, `standalone`, 테마 색
- `public/sw.js` — 최소 서비스 워커(설치 조건 충족, 요청은 네트워크 우선으로 캐시 이슈 최소화)
- `public/logo192.png`, `public/logo512.png` — 현재는 `assets/images/icon.png` 복사본(필요 시 192·512px 전용 PNG로 교체 권장)

Chrome/Edge: 주소창의 **설치** 아이콘 또는 메뉴에서 “앱 설치”.  
iOS Safari: **공유 → 홈 화면에 추가**.

오프라인 캐시를 강화하려면 [Expo PWA 가이드](https://docs.expo.dev/guides/progressive-web-apps/)의 Workbox 절차를 `export:web` 이후 단계에 붙이면 됩니다.

## 7. 주의

- 루트 `pnpm-workspace.yaml`의 `minimumReleaseAge` 때문에 **최근에 올라온 패키지**가 있으면 설치가 실패할 수 있습니다. 그때는 잠시 후 재시도하거나 정책을 조정하세요.
- **`.env`는 Git에 넣지 마세요.** Vercel **Environment Variables**에만 등록합니다.
