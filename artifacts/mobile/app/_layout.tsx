// Root layout for KITCH - Stack navigation
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Colors from '@/constants/colors';

// SplashScreen is native-only — skip on web to avoid invisible overlay
if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync();
}

const queryClient = new QueryClient();

function isYouTubeUrl(url: string) {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // 웹에서 딥링크로 진입 시 첫 화면으로 리셋 (이미 / 이면 스킵)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path !== '/' && path !== '') {
        router.replace('/');
      }
    }
  }, []);

  // 공유 URL 처리: 앱이 실행 중일 때
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (isYouTubeUrl(url)) {
        router.push({ pathname: '/input', params: { type: 'youtube', sharedUrl: url } });
      } else if (url.startsWith('http')) {
        router.push({ pathname: '/input', params: { type: 'news', sharedUrl: url } });
      }
    });
    return () => sub.remove();
  }, []);

  // 공유 URL 처리: 콜드 스타트 (앱이 꺼져있을 때 공유로 진입)
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (!url) return;
      if (isYouTubeUrl(url)) {
        router.push({ pathname: '/input', params: { type: 'youtube', sharedUrl: url } });
      } else if (url.startsWith('http')) {
        router.push({ pathname: '/input', params: { type: 'news', sharedUrl: url } });
      }
    });
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && Platform.OS !== 'web') {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // On web: render immediately (don't block on font loading — avoids blank screen)
  // On native: wait for fonts to prevent layout flash
  if (!fontsLoaded && !fontError && Platform.OS !== 'web') return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#F5F5FA' }}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: Colors.background },
                animation: 'slide_from_right',
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="kiwoom-menu" options={{ headerShown: false, animation: 'slide_from_left' }} />
              <Stack.Screen name="kitch-home" options={{ headerShown: false }} />
              <Stack.Screen name="input" options={{ headerShown: false }} />
              <Stack.Screen name="result" options={{ headerShown: false }} />
              <Stack.Screen
                name="analyze-sheet"
                options={{
                  presentation: 'formSheet',
                  sheetAllowedDetents: [0.55],
                  sheetGrabberVisible: false,
                  headerShown: false,
                  contentStyle: { backgroundColor: Colors.surface },
                }}
              />
            </Stack>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
