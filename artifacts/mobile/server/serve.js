/**
 * Standalone production server for Expo static builds.
 *
 * - Browser request (no expo-platform header) → serves Expo web build from web-dist/
 * - expo-platform: ios/android header → serves native OTA manifest from static-build/
 * - Everything else → static file from web-dist/ or static-build/
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const STATIC_ROOT = path.resolve(__dirname, "..", "static-build");
const WEB_DIST = path.resolve(__dirname, "..", "web-dist");
const TEMPLATE_PATH = path.resolve(__dirname, "templates", "landing-page.html");
const basePath = (process.env.BASE_PATH || "/").replace(/\/+$/, "");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".map": "application/json",
};

const hasWebBuild = fs.existsSync(path.join(WEB_DIST, "index.html"));

if (hasWebBuild) {
  console.log("Web build found at web-dist/ — browser requests will get the web app");
} else {
  console.log("No web build found — browser requests will get the QR landing page");
}

function getAppName() {
  try {
    const appJsonPath = path.resolve(__dirname, "..", "app.json");
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf-8"));
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function serveManifest(platform, res) {
  const manifestPath = path.join(STATIC_ROOT, platform, "manifest.json");

  if (!fs.existsSync(manifestPath)) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(
      JSON.stringify({ error: `Manifest not found for platform: ${platform}` }),
    );
    return;
  }

  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.writeHead(200, {
    "content-type": "application/json",
    "expo-protocol-version": "1",
    "expo-sfv-version": "0",
  });
  res.end(manifest);
}

function serveLandingPage(req, res, landingPageTemplate, appName) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = forwardedProto || "https";
  const host = req.headers["x-forwarded-host"] || req.headers["host"];
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
}

/** Serve a file from web-dist/. Unknown paths return index.html (SPA fallback). */
function serveWebApp(urlPath, res) {
  const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = path.join(WEB_DIST, safePath);

  if (
    filePath.startsWith(WEB_DIST) &&
    fs.existsSync(filePath) &&
    !fs.statSync(filePath).isDirectory()
  ) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, { "content-type": contentType });
    res.end(fs.readFileSync(filePath));
    return;
  }

  // SPA fallback — serve index.html for all unknown paths
  const indexPath = path.join(WEB_DIST, "index.html");
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(fs.readFileSync(indexPath));
}

function serveStaticFile(urlPath, res) {
  const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = path.join(STATIC_ROOT, safePath);

  if (!filePath.startsWith(STATIC_ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end("Not Found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const content = fs.readFileSync(filePath);
  res.writeHead(200, { "content-type": contentType });
  res.end(content);
}

const landingPageTemplate = fs.existsSync(TEMPLATE_PATH)
  ? fs.readFileSync(TEMPLATE_PATH, "utf-8")
  : "";
const appName = getAppName();

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  let pathname = url.pathname;

  if (basePath && pathname.startsWith(basePath)) {
    pathname = pathname.slice(basePath.length) || "/";
  }

  const platform = req.headers["expo-platform"];

  // Native Expo Go requests → serve OTA manifest/bundles
  if (platform === "ios" || platform === "android") {
    if (pathname === "/" || pathname === "/manifest") {
      return serveManifest(platform, res);
    }
    return serveStaticFile(pathname, res);
  }

  // Browser requests → serve web app if available, else QR landing page
  if (hasWebBuild) {
    return serveWebApp(pathname, res);
  }

  if (pathname === "/") {
    return serveLandingPage(req, res, landingPageTemplate, appName);
  }

  serveStaticFile(pathname, res);
});

const port = parseInt(process.env.PORT || "3000", 10);
server.listen(port, "0.0.0.0", () => {
  console.log(`Serving on port ${port} — web build: ${hasWebBuild ? "YES" : "NO"}`);
});
