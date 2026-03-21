# API 서버 (`@workspace/api-server`)

## Vercel 배포가 `npm install` 에서 실패할 때

이 패키지는 **pnpm 워크스페이스** 전용입니다 (`workspace:*`, `catalog:`). Vercel이 **`artifacts/api-server`만** 올리면 상위 `pnpm-lock.yaml`이 없어 `npm install`이 깨집니다.

### 권장: Git 연동

Vercel 프로젝트 **Root Directory**를 `artifacts/api-server`로 두고 GitHub/GitLab과 연결하면, 저장소 전체가 클론되므로 `vercel.json`의 `cd ../.. && pnpm install`이 정상 동작합니다.

### CLI로 배포할 때

`artifacts/api-server`에서만 `npx vercel deploy` 하면 **상위 `pnpm-lock.yaml`이 업로드되지 않아** 설치가 실패할 수 있습니다. 저장소 **루트**에서 올리되, Vercel **api-server** 프로젝트를 쓰도록 환경 변수로 지정합니다 (`artifacts/api-server/.vercel/project.json`의 `orgId` / `projectId`).

PowerShell 예:

```powershell
cd C:\path\to\KITCH-master
$env:VERCEL_ORG_ID = "team_..."      # project.json 의 orgId
$env:VERCEL_PROJECT_ID = "prj_..."   # project.json 의 projectId
npx vercel deploy . --prod --yes -A artifacts/api-server/vercel.json
```

Vercel 대시보드에서 해당 프로젝트의 **Root Directory**가 `artifacts/api-server`로 맞는지 확인하세요.

**주의:** 루트에 `kitch-web`용 `.vercel`이 있으면 `vercel deploy ../..`만 쓰면 **웹 프로젝트**로 배포될 수 있으니, 위처럼 `VERCEL_PROJECT_ID`로 api-server를 지정하는 편이 안전합니다.

### `public` 폴더

루트 안내용 **`public/index.html`** 은 저장소에 포함해 두었습니다. **Output Directory**는 `vercel.json`에 두지 않습니다. (과거 `outputDirectory: "public"` + `api/[...path].js` 조합에서 **프로덕션에 `/api/market/...` 등이 Vercel NOT_FOUND** 로 떨어지는 문제가 있었습니다.) 대시보드에 **Output Directory**가 `public`으로 남아 있으면 비우거나, 빌드 산출물과 맞지 않으면 제거하세요.

### Express on Vercel

`api/index.ts`에서 Express `app`을 export 하므로 서버리스 함수로 동작합니다. 로컬에서는 `pnpm dev`(또는 `src/index.ts`)로 포트 리슨합니다.

### 웹 앱에서 「서버에 연결할 수 없습니다」(Failed to fetch) — **Deployment Protection**

`kitch-web` 같은 **다른 도메인**에서 `fetch`로 이 API를 호출합니다. Vercel이 **배포 보호**(Vercel Authentication 등)를 켜 두면:

1. API URL은 **401**과 **HTML 로그인 페이지**를 돌려보냅니다.
2. 그 응답에는 브라우저가 기대하는 **CORS 헤더가 없어**, `fetch`는 **`Failed to fetch`** / 「서버에 연결할 수 없습니다」로 보입니다 (앱 버그가 아니라 보호 + CORS 조합).

**해결:** [Vercel Dashboard](https://vercel.com) → **api-server** 프로젝트 → **Settings** → **Deployment Protection**

- **프로덕션 도메인**(`*.vercel.app` 또는 커스텀 도메인)은 **공개 접근**이 되도록 설정하세요. (팀 기본이 “모든 배포 보호”이면 프로덕션까지 막힐 수 있습니다.)
- 미리보기만 보호하고 프로덕션은 열어두는 **Standard Protection** 등, 공개 API에 맞는 옵션을 선택하세요.

공개 API는 코드로 우회할 수 없고, **대시보드에서 보호 범위를 조정**해야 합니다.

### Vercel 프로젝트 Root Directory

Git 연동 시 **Root Directory**가 저장소 루트(`.`)로만 잡혀 있으면 루트 `vercel.json`의 `vercel-build`(Expo 웹)가 실행되어 **API가 아니라 프론트 정적 파일**이 배포됩니다. **api-server** 프로젝트는 대시보드 또는 API에서 **`artifacts/api-server`** 로 두어야 합니다.

### `api/index.js` + `rewrites`

**`api/index.js`** 에서 Express 앱을 `export default` 하고, **`vercel.json`의 `rewrites`** 로 `source: "/api/(.*)"` → `destination: "/api"` 를 두면 **`/api/market/kospi` 등 모든 하위 경로**가 같은 핸들러로 들어갑니다.
