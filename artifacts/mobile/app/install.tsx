/**
 * PWA 설치 안내 — 사용자가 자신의 도메인으로 접속해
 * 브라우저에서 "앱 설치" / iOS "홈 화면에 추가" 절차를 볼 수 있습니다.
 */
import { router } from 'expo-router';
import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function getOrigin(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
}

export default function InstallScreen() {
  const insets = useSafeAreaInsets();
  const origin = getOrigin();

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1}>KITCH 앱으로 설치하기</Text>
        <Text style={styles.lead}>
          이 페이지 주소({origin || '현재 사이트'})를 브라우저로 열면, 아래 방법으로 휴대폰·PC에 앱처럼
          추가할 수 있어요. 별도 스토어 설치 없이 웹(PWA)으로 제공됩니다.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Android (Chrome)</Text>
          <Text style={styles.cardBody}>
            1. Chrome으로 이 사이트를 엽니다.{'\n'}
            2. 주소창 오른쪽의 「설치」 또는 메뉴(⋮) → 「앱 설치」를 누릅니다.{'\n'}
            3. 또는 화면 하단에 나오는 설치 배너에서 「설치」를 누릅니다.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>iPhone / iPad (Safari)</Text>
          <Text style={styles.cardBody}>
            1. Safari로 이 사이트를 엽니다.{'\n'}
            2. 하단 공유 버튼(□↑)을 누릅니다.{'\n'}
            3. 「홈 화면에 추가」→ 「추가」를 누릅니다.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Windows / Mac (Chrome, Edge)</Text>
          <Text style={styles.cardBody}>
            주소창 오른쪽의 설치 아이콘을 누르거나, 메뉴에서 「KITCH 설치」를 선택합니다.
          </Text>
        </View>

        <Text style={styles.note}>
          HTTPS와 manifest·서비스 워커가 준비된 경우에만 설치 메뉴가 나타납니다. Vercel에 커스텀 도메인을
          연결했다면, 배포 설정의 EXPO_PUBLIC_SITE_URL 도 해당 도메인(https 포함)으로 맞추세요.
        </Text>

        <Pressable
          onPress={() => router.replace('/')}
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          accessibilityRole="button"
          accessibilityLabel="홈으로"
        >
          <Text style={styles.btnText}>홈으로 돌아가기</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F5FA',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  h1: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: '#0F172A',
    marginBottom: 12,
  },
  lead: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
  },
  cardTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#12146A',
    marginBottom: 8,
  },
  cardBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#475569',
    lineHeight: 21,
  },
  note: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 20,
  },
  btn: {
    alignSelf: 'flex-start',
    backgroundColor: '#12146A',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  btnPressed: {
    opacity: 0.88,
  },
  btnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
  },
});
