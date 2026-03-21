/* 최소 PWA용 서비스 워커 — 설치 가능 조건 충족 + 항상 네트워크 우선(캐시로 인한 업데이트 지연 최소화) */
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
