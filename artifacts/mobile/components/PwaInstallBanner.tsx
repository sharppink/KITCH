/**
 * PWA 설치 유도 — beforeinstallprompt 커스텀 UI
 * PC(Chrome·Edge)·Android Chrome 등에서 이벤트가 오면 표시.
 * iOS Safari 등은 해당 이벤트가 없어 배너가 뜨지 않을 수 있음.
 */
import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
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
  }
}

function isStandalonePwa(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function PwaInstallBanner() {
  const insets = useSafeAreaInsets();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEventLike | null>(null);
  const [visible, setVisible] = useState(false);

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

    const applyCaptured = (e: BeforeInstallPromptEventLike | null | undefined) => {
      if (e && typeof e.prompt === 'function') {
        setDeferred(e);
        setVisible(true);
      }
    };

    /** 인라인 스크립트가 이미 저장해 둔 경우(프로덕션 번들 로드 전에 이벤트가 발생한 경우) */
    applyCaptured(window.__kitchDeferredInstallPrompt ?? null);

    const onEarlyCapture = () => {
      applyCaptured(window.__kitchDeferredInstallPrompt ?? null);
    };

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      const ev = e as BeforeInstallPromptEventLike;
      window.__kitchDeferredInstallPrompt = ev;
      setDeferred(ev);
      setVisible(true);
    };

    const onInstalled = () => {
      try {
        localStorage.setItem(STORAGE_INSTALLED, '1');
      } catch {
        /* ignore */
      }
      window.__kitchDeferredInstallPrompt = null;
      setVisible(false);
      setDeferred(null);
    };

    window.addEventListener('kitch:pwa-install-prompt', onEarlyCapture);
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('kitch:pwa-install-prompt', onEarlyCapture);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const onDismiss = useCallback(() => {
    try {
      sessionStorage.setItem(STORAGE_DISMISS, '1');
    } catch {
      /* ignore */
    }
    if (typeof window !== 'undefined') {
      window.__kitchDeferredInstallPrompt = null;
    }
    setVisible(false);
    setDeferred(null);
  }, []);

  const onInstall = useCallback(async () => {
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
    setVisible(false);
  }, [deferred]);

  /** 브라우저 탭으로 열린 경우에만(standalone 아님). 설치 프롬프트를 받은 뒤에만 표시 — iOS Safari 등은 이벤트 없음 */
  if (Platform.OS !== 'web' || !visible || !deferred) {
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
    zIndex: 99999,
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
