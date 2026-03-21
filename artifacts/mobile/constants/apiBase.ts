import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = 8080;

/** `EXPO_PUBLIC_USE_REMOTE_API=1` 이면 로컬 웹에서도 `localhost:8080` 대신 Vercel 등 원격 API만 사용 */
const USE_REMOTE_API =
  process.env.EXPO_PUBLIC_USE_REMOTE_API === '1' ||
  process.env.EXPO_PUBLIC_USE_REMOTE_API === 'true';

/**
 * Vercel 등 공개 배포 시 기본 API (로컬호스트 미사용).
 * 포크·자체 API는 빌드 시 EXPO_PUBLIC_API_URL 로 덮어쓰기.
 */
const DEFAULT_PUBLIC_API_BASE = 'https://api-server-sharppinks-projects.vercel.app/api';

/** Vercel·Netlify 등 공개 호스트 — 같은 탭에 :8080 로컬 API가 붙지 않음 */
function isPublicDeploymentHostname(hostname: string): boolean {
  if (!hostname) return false;
  const h = hostname.toLowerCase();
  return (
    h.endsWith('.vercel.app') ||
    h.endsWith('.netlify.app') ||
    h.endsWith('.github.io') ||
    h.endsWith('.pages.dev') ||
    h.endsWith('.cloudflarepages.dev') ||
    h.endsWith('.firebaseapp.com')
  );
}

/** 로컬/사설망에서만 같은 호스트:8080 API 가정 (공개 배포 도메인에는 적용하지 않음) */
function isPrivateOrLocalHostname(hostname: string): boolean {
  if (!hostname) return true;
  if (isPublicDeploymentHostname(hostname)) return false;
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1') return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  return false;
}

/** 구버전이 localStorage에 넣었을 수 있는 잘못된 주소 (공개 도메인 + :8080) */
function isStaleWrongPort8080Override(url: string): boolean {
  const u = url.toLowerCase();
  return (
    /\.vercel\.app:8080\b/.test(u) ||
    /\.netlify\.app:8080\b/.test(u) ||
    /\.github\.io:8080\b/.test(u)
  );
}

/**
 * HTTPS로 열린 사이트(kitch-web.vercel.app 등)에서 `http://localhost`/`127.0.0.1` API는
 * 브라우저 혼합 콘텐츠 정책으로 fetch 자체가 막힘. 로컬 개발(HTTP 탭)에서만 유효한 override.
 */
function isHttpLoopbackOverrideOnHttpsPage(url: string): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  if (window.location.protocol !== 'https:') return false;
  const raw = url.trim();
  if (!raw.toLowerCase().startsWith('http://')) return false;
  try {
    const u = new URL(raw);
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

/**
 * localhost/127 탭에서 저장된 https 원격 API 주소는 개발 시 혼선만 줌 → 무시하고 제거
 * (`EXPO_PUBLIC_USE_REMOTE_API=1` 이면 제거하지 않음)
 */
function shouldDropHttpsRemoteOverrideOnLocalhostTab(url: string): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const tabHost = window.location.hostname.toLowerCase();
  if (tabHost !== 'localhost' && tabHost !== '127.0.0.1' && tabHost !== '') {
    return false;
  }
  const raw = url.trim();
  if (!raw.toLowerCase().startsWith('https://')) return false;
  try {
    const u = new URL(raw);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return false;
    return true;
  } catch {
    return false;
  }
}

/** 앱에 저장되는 원격 API 베이스 (끝은 /api 권장) */
export const API_BASE_STORAGE_KEY = '@kitch/api_base_url';

let overrideFromStorage: string | null = null;

/** 웹: 모듈 로드 시 localStorage에서 동기 로드 */
function bootstrapWebStorage(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    const v = window.localStorage.getItem(API_BASE_STORAGE_KEY)?.trim();
    overrideFromStorage = v || null;
  } catch {
    overrideFromStorage = null;
  }
}

bootstrapWebStorage();

/** bootstrap 직후 잘못 저장된 override 제거 (동기) */
function discardStaleOverrideIfNeeded(): void {
  if (!overrideFromStorage || !isStaleWrongPort8080Override(overrideFromStorage)) {
    return;
  }
  overrideFromStorage = null;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(API_BASE_STORAGE_KEY);
    } catch {
      /* noop */
    }
  }
}

discardStaleOverrideIfNeeded();

/** bootstrap 직후: HTTPS 프로덕션에서 localhost http override 제거 (동기) */
function discardHttpsLoopbackOverrideIfNeeded(): void {
  if (!overrideFromStorage || !isHttpLoopbackOverrideOnHttpsPage(overrideFromStorage)) {
    return;
  }
  overrideFromStorage = null;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(API_BASE_STORAGE_KEY);
    } catch {
      /* noop */
    }
  }
}

discardHttpsLoopbackOverrideIfNeeded();

/**
 * 네이티브에서 AsyncStorage를 읽은 뒤에만 호출됨. 웹은 bootstrap에서 이미 반영.
 */
export async function initApiBase(): Promise<void> {
  if (Platform.OS === 'web') {
    bootstrapWebStorage();
    return;
  }
  try {
    const v = (await AsyncStorage.getItem(API_BASE_STORAGE_KEY))?.trim();
    if (v && isStaleWrongPort8080Override(v)) {
      await AsyncStorage.removeItem(API_BASE_STORAGE_KEY);
      overrideFromStorage = null;
    } else {
      overrideFromStorage = v || null;
    }
  } catch {
    overrideFromStorage = null;
  }
}

/**
 * 사용자가 입력한 URL을 정규화 (스킴 없으면 https, 경로 끝에 /api 가 없으면 추가)
 */
export function normalizeApiBaseInput(input: string): string {
  let s = input.trim().replace(/\/+$/, '');
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) {
    s = `https://${s}`;
  }
  if (!/\/api$/i.test(s)) {
    s = `${s}/api`;
  }
  return s.replace(/\/$/, '');
}

/**
 * 저장된 주소 제거 후 기본 로직만 사용
 */
export async function clearApiBaseOverride(): Promise<void> {
  overrideFromStorage = null;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(API_BASE_STORAGE_KEY);
    } catch {
      /* noop */
    }
    return;
  }
  await AsyncStorage.removeItem(API_BASE_STORAGE_KEY);
}

/**
 * 원격 API 주소 저장 (ngrok, 클라우드 배포 URL 등). 빈 문자열이면 삭제와 동일.
 */
export async function setApiBaseOverride(raw: string): Promise<void> {
  const trimmed = raw.trim();
  if (!trimmed) {
    await clearApiBaseOverride();
    return;
  }
  const normalized = normalizeApiBaseInput(trimmed);
  overrideFromStorage = normalized;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(API_BASE_STORAGE_KEY, normalized);
    } catch {
      /* noop */
    }
    return;
  }
  await AsyncStorage.setItem(API_BASE_STORAGE_KEY, normalized);
}

export function getStoredApiBaseOverride(): string | null {
  return overrideFromStorage;
}

/**
 * API 베이스 URL (`.../api` 까지, 끝 슬래시 없음).
 *
 * 우선순위:
 * 1. 앱에 저장된 주소 (원격/ngrok/클라우드) — 와이파이 무관
 * 2. 웹 + 로컬/사설망 + `EXPO_PUBLIC_USE_REMOTE_API` 아님: `http://호스트:8080/api` (로컬 api-server)
 * 3. `EXPO_PUBLIC_API_URL` 빌드 타임
 * 4. `EXPO_PUBLIC_DOMAIN` → `https://…/api`
 * 5. 웹: 공개 배포 호스트 → DEFAULT_PUBLIC_API_BASE (env 없을 때)
 * 6. 웹: 그 외 호스트 → DEFAULT_PUBLIC_API_BASE
 * 7. 네이티브 프로덕션 빌드 → 항상 DEFAULT_PUBLIC_API_BASE (localhost 미사용)
 * 8. 네이티브 __DEV__ → Expo LAN 또는 localhost:8080
 */
export function getApiBaseUrl(): string {
  if (overrideFromStorage) {
    const o = overrideFromStorage.replace(/\/$/, '');
    if (isHttpLoopbackOverrideOnHttpsPage(o)) {
      overrideFromStorage = null;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        try {
          window.localStorage.removeItem(API_BASE_STORAGE_KEY);
        } catch {
          /* noop */
        }
      }
    } else if (isStaleWrongPort8080Override(o)) {
      overrideFromStorage = null;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        try {
          window.localStorage.removeItem(API_BASE_STORAGE_KEY);
        } catch {
          /* noop */
        }
      } else {
        void AsyncStorage.removeItem(API_BASE_STORAGE_KEY);
      }
    } else if (shouldDropHttpsRemoteOverrideOnLocalhostTab(o) && !USE_REMOTE_API) {
      overrideFromStorage = null;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        try {
          window.localStorage.removeItem(API_BASE_STORAGE_KEY);
        } catch {
          /* noop */
        }
      }
    } else {
      return o;
    }
  }

  // 웹에서 localhost / 192.168.x.x 등: 기본은 로컬 api-server:8080 (USE_REMOTE_API 이면 건너뜀)
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const { hostname } = window.location;
    if (isPrivateOrLocalHostname(hostname) && !USE_REMOTE_API) {
      const h = hostname === '127.0.0.1' || hostname === '' ? 'localhost' : hostname;
      return `http://${h}:${API_PORT}/api`;
    }
  }

  const explicit = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }

  const domain = process.env.EXPO_PUBLIC_DOMAIN?.trim();
  if (domain) {
    const host = domain.replace(/^https?:\/\//, '').split('/')[0];
    return `https://${host}/api`;
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const { hostname } = window.location;
    if (isPublicDeploymentHostname(hostname)) {
      return DEFAULT_PUBLIC_API_BASE;
    }
    return DEFAULT_PUBLIC_API_BASE;
  }

  // iOS/Android: 스토어·내부 배포 빌드는 로컬호스트로는 API에 닿을 수 없음
  if (!__DEV__) {
    return DEFAULT_PUBLIC_API_BASE;
  }

  const hostFromExpo = getExpoDevLanHost();
  if (hostFromExpo) {
    return `http://${hostFromExpo}:${API_PORT}/api`;
  }

  return `http://localhost:${API_PORT}/api`;
}

function getExpoDevLanHost(): string | null {
  const expoConfig = Constants.expoConfig as { hostUri?: string } | null;
  const fromConfig = expoConfig?.hostUri;
  const go = Constants.expoGoConfig as { debuggerHost?: string } | null;
  const fromGo = go?.debuggerHost;
  const raw = fromConfig ?? fromGo;
  if (!raw || typeof raw !== 'string') {
    return null;
  }
  const host = raw.split(':')[0]?.trim();
  if (!host || host === 'localhost' || host === '127.0.0.1') {
    return null;
  }
  return host;
}
