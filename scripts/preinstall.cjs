/**
 * 루트 preinstall: lock 파일 정리 + pnpm 강제 (Windows에서 sh 불필요)
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

for (const name of ["package-lock.json", "yarn.lock"]) {
  const fp = path.join(root, name);
  try {
    fs.unlinkSync(fp);
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
}

const ua = process.env.npm_config_user_agent || "";
if (!ua.includes("pnpm")) {
  console.error(
    "This workspace uses pnpm only. Run: corepack enable && pnpm install",
  );
  process.exit(1);
}
