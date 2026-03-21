/**
 * Vercel: /api/* 전부 이 함수로 (index.js 는 /api 만 매칭되어 /api/healthz 가 404).
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const mod = require("../dist/serverless.cjs");
const app = mod.default != null ? mod.default : mod;

export default app;
