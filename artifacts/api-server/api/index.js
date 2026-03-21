/**
 * Vercel: 모든 `/api/*` 요청을 Express로 넘김.
 * `rewrites`로 `/api/(.*)` → 이 핸들러로 보내므로 `/api/market/kospi` 등 중첩 경로도 동작합니다.
 * (기존 `api/[...path].js`만으로는 프로덕션에서 일부 경로가 NOT_FOUND 되는 경우가 있었습니다.)
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const mod = require("../dist/serverless.cjs");
const app = mod.default != null ? mod.default : mod;

export default app;
