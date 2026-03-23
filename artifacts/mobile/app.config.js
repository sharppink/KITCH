/**
 * Expo 설정 — `app.json`을 기반으로 빌드 시점 환경 변수를 반영합니다.
 * 커스텀 도메인(예: https://app.example.com)으로 PWA를 배포할 때는
 * Vercel 등에서 EXPO_PUBLIC_SITE_URL 을 설정하세요 (끝 슬래시 없이).
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const appJson = require('./app.json');

const DEFAULT_SITE = 'https://kitch-web.vercel.app';

module.exports = () => {
  const expo = JSON.parse(JSON.stringify(appJson.expo));
  const raw = process.env.EXPO_PUBLIC_SITE_URL;
  const siteUrl = (raw && raw.trim() !== '' ? raw : DEFAULT_SITE).replace(/\/$/, '');

  expo.plugins = (expo.plugins || []).map((p) => {
    if (Array.isArray(p) && p[0] === 'expo-router') {
      const opts = typeof p[1] === 'object' && p[1] !== null ? { ...p[1] } : {};
      opts.origin = siteUrl;
      return ['expo-router', opts];
    }
    return p;
  });

  return { expo };
};
