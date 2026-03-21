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

### Express on Vercel

`api/index.ts`에서 Express `app`을 export 하므로 서버리스 함수로 동작합니다. 로컬에서는 `pnpm dev`(또는 `src/index.ts`)로 포트 리슨합니다.
