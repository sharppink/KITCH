/**
 * PWA 설치 유도 — 시안과 동일한 하단 배너
 * - Chrome/Edge/Android: `beforeinstallprompt` → 「설치」가 브라우저 설치 다이얼로그 호출
 * - iOS Safari 등: 해당 이벤트 없음 → 같은 배너로 안내 후 「설치」는 /install 단계별 안내로 이동
 * - 그 외 BIP 지연: 일정 시간 후 수동 안내 모드
 */
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STORAGE_DISMISS = 'kitch_pwa_install_banner_dismissed';
const STORAGE_INSTALLED = 'kitch_pwa_installed';

/** Chrome beforeinstallprompt (타입 lib 미포함 대비) */
type BeforeInstallPromptEventLike = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

declare global {
  interface Window {
    /** public/index.html 인라인 스크립트가 번들보다 먼저 캡처한 이벤트 */
    __kitchDeferredInstallPrompt?: BeforeInstallPromptEventLike | null;
    /** app/index 온보딩이 열려 있으면 true — 설치 배너 숨김 */
    __kitchPwaBlockOnboarding?: boolean;
  }
}

function isStandalonePwa(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iOS/iPadOS 브라우저(애플 정책상 beforeinstallprompt 없음 → 수동 안내) */
function isIosBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/i.test(ua)) return true;
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true;
  return false;
}

/** BIP가 오지 않을 때 수동 안내 배너를 띄우기까지 대기(ms). iOS는 즉시 수동 모드 */
const MANUAL_FALLBACK_MS = 5500;

type InstallMode = 'native' | 'manual' | null;

export function PwaInstallBanner() {
  const insets = useSafeAreaInsets();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEventLike | null>(null);
  /** native: 브라우저 설치 API 사용 / manual: /install 안내 */
  const [installMode, setInstallMode] = useState<InstallMode>(null);
  /** index 화면 온보딩(환영)이 열려 있을 때 — 겹침 방지로 설치 배너 숨김 */
  const [blockedByOnboarding, setBlockedByOnboarding] = useState(false);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFallbackTimer = useCallback(() => {
    if (fallbackTimerRef.current !== null) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  useLayoutEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const sync = () => {
      setBlockedByOnboarding(!!window.__kitchPwaBlockOnboarding);
    };
    sync();
    window.addEventListener('kitch:pwa-onboarding-sync', sync);
    return () => window.removeEventListener('kitch:pwa-onboarding-sync', sync);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    try {
      if (sessionStorage.getItem(STORAGE_DISMISS) === '1') return;
      if (localStorage.getItem(STORAGE_INSTALLED) === '1') return;
    } catch {
      return;
    }

    if (isStandalonePwa()) {
      try {
        localStorage.setItem(STORAGE_INSTALLED, '1');
      } catch {
        /* ignore */
      }
      return;
    }

    const goNative = (e: BeforeInstallPromptEventLike) => {
      clearFallbackTimer();
      setDeferred(e);
      setInstallMode('native');
    };

    const applyCaptured = (e: BeforeInstallPromptEventLike | null | undefined) => {
      if (e && typeof e.prompt === 'function') {
        goNative(e);
      }
    };

    /** 인라인 스크립트가 이미 저장해 둔 경우 */
    applyCaptured(window.__kitchDeferredInstallPrompt ?? null);

    const scheduleManualFallback = () => {
      clearFallbackTimer();
      fallbackTimerRef.current = setTimeout(() => {
        fallbackTimerRef.current = null;
        if (window.__kitchDeferredInstallPrompt && typeof window.__kitchDeferredInstallPrompt.prompt === 'function') {
          return;
        }
        try {
          if (sessionStorage.getItem(STORAGE_DISMISS) === '1') return;
        } catch {
          return;
        }
        setInstallMode((m) => (m === 'native' ? 'native' : 'manual'));
      }, MANUAL_FALLBACK_MS);
    };

    const hasNativePrompt =
      window.__kitchDeferredInstallPrompt != null &&
      typeof window.__kitchDeferredInstallPrompt.prompt === 'function';
    if (!hasNativePrompt) {
      if (isIosBrowser()) {
        setInstallMode('manual');
      } else {
        scheduleManualFallback();
      }
    }

    const onEarlyCapture = () => {
      applyCaptured(window.__kitchDeferredInstallPrompt ?? null);
    };

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      const ev = e as BeforeInstallPromptEventLike;
      window.__kitchDeferredInstallPrompt = ev;
      goNative(ev);
    };

    const onInstalled = () => {
      try {
        localStorage.setItem(STORAGE_INSTALLED, '1');
      } catch {
        /* ignore */
      }
      window.__kitchDeferredInstallPrompt = null;
      clearFallbackTimer();
      setInstallMode(null);
      setDeferred(null);
    };

    window.addEventListener('kitch:pwa-install-prompt', onEarlyCapture);
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      clearFallbackTimer();
      window.removeEventListener('kitch:pwa-install-prompt', onEarlyCapture);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [clearFallbackTimer]);

  const onDismiss = useCallback(() => {
    try {
      sessionStorage.setItem(STORAGE_DISMISS, '1');
    } catch {
      /* ignore */
    }
    if (typeof window !== 'undefined') {
      window.__kitchDeferredInstallPrompt = null;
    }
    clearFallbackTimer();
    setInstallMode(null);
    setDeferred(null);
  }, [clearFallbackTimer]);

  const onInstall = useCallback(async () => {
    if (installMode === 'manual') {
      try {
        sessionStorage.setItem(STORAGE_DISMISS, '1');
      } catch {
        /* ignore */
      }
      setInstallMode(null);
      router.push('/install');
      return;
    }
    if (!deferred || typeof deferred.prompt !== 'function') return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      /* 사용자 취소 등 */
    }
    if (typeof window !== 'undefined') {
      window.__kitchDeferredInstallPrompt = null;
    }
    setDeferred(null);
    setInstallMode(null);
  }, [deferred, installMode]);

  if (Platform.OS !== 'web' || installMode === null || blockedByOnboarding) {
    return null;
  }

  const bottomPad = Math.max(insets.bottom, 12);

  return (
    <View
      style={[styles.wrap, styles.wrapWeb, { paddingBottom: bottomPad }]}
      pointerEvents="box-none"
    >
      <View style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.iconBox}>
            <Feather name="smartphone" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.textCol}>
            <Text style={styles.title}>앱으로 설치하기</Text>
            <Text style={styles.desc}>
              홈 화면에 KITCH를 추가해서 앱처럼 바로 열 수 있어요.
            </Text>
          </View>
        </View>
        <View style={styles.btnRow}>
          <Pressable
            onPress={onDismiss}
            style={({ pressed }) => [styles.btnSecondary, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="닫기"
          >
            <Text style={styles.btnSecondaryText}>닫기</Text>
          </Pressable>
          <Pressable
            onPress={onInstall}
            style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="설치"
          >
            <Text style={styles.btnPrimaryText}>설치</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** 디자인 시안: 짙은 네이비 배경, 하단 고정 카드 */
const NAVY = '#1A1C4E';
const NAVY_LIGHT = 'rgba(255,255,255,0.12)';
const BTN_DARK = 'rgba(255,255,255,0.16)';

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    /** 온보딩(zIndex 100) 등 위에 확실히 올림 */
    zIndex: 999999,
    paddingHorizontal: 14,
    pointerEvents: 'box-none',
  },
  /** 웹: 스크롤·레이아웃과 무관하게 화면 맨 아래에 고정 */
  wrapWeb:
    Platform.OS === 'web'
      ? {
          position: 'fixed' as const,
          width: '100%' as const,
          maxWidth: '100%' as const,
        }
      : {},
  card: {
    backgroundColor: NAVY,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: NAVY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  desc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 19,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
  },
  btnSecondary: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: BTN_DARK,
  },
  btnPrimary: {
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  btnSecondaryText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  btnPrimaryText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#1A1C4E',
  },
  pressed: {
    opacity: 0.85,
  },
});
