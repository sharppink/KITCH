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
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Colors from '@/constants/colors';

SplashScreen.preventAutoHideAsync();

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
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.background }}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: Colors.background },
                animation: 'slide_from_right',
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
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
