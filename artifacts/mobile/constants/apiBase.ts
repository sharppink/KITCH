import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = 8080;

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
 * 2. `EXPO_PUBLIC_API_URL` 빌드 타임
 * 3. `EXPO_PUBLIC_DOMAIN` → `https://…/api`
 * 4. 웹: 로컬/사설망일 때만 `http://호스트:8080/api` (같은 PC API, __DEV__·로컬 접속)
 * 5. 웹: 공개 배포 호스트 → DEFAULT_PUBLIC_API_BASE (env 없을 때)
 * 6. 네이티브 프로덕션 빌드 → 항상 DEFAULT_PUBLIC_API_BASE (localhost 미사용)
 * 7. 네이티브 __DEV__ → Expo LAN 또는 localhost:8080
 */
export function getApiBaseUrl(): string {
  if (overrideFromStorage) {
    const o = overrideFromStorage.replace(/\/$/, '');
    if (isStaleWrongPort8080Override(o)) {
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
    } else {
      return o;
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
    // 공개 PaaS( kitch-web.vercel.app 등 ): 과거 번들·버그로 :8080 이 붙지 않도록 최우선 차단
    if (isPublicDeploymentHostname(hostname)) {
      return DEFAULT_PUBLIC_API_BASE;
    }
    if (isPrivateOrLocalHostname(hostname)) {
      const h = hostname === '127.0.0.1' || hostname === '' ? 'localhost' : hostname;
      return `http://${h}:${API_PORT}/api`;
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
