import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import { KiwoomBottomBar } from '@/components/KiwoomBottomBar';
import {
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useAnalysisHistory } from '@/hooks/useAnalysisHistory';
import { HistoryCard } from '@/components/HistoryCard';
import { HistoryItem } from '@/hooks/useAnalysisHistory';

const ONBOARDING_KEY = 'kitch_onboarding_v1';

export default function Home() {
  const insets = useSafeAreaInsets();
  const { history, deleteFromHistory } = useAnalysisHistory();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      if (!val) setShowOnboarding(true);
    });
  }, []);

  useEffect(() => {
    if (showOnboarding) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }
  }, [showOnboarding]);

  const dismissOnboarding = async () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setShowOnboarding(false);
    });
    await AsyncStorage.setItem(ONBOARDING_KEY, 'done');
  };

  const handleViewResult = (item: HistoryItem) => {
    router.push({ pathname: '/result', params: { historyId: item.id, cached: 'true' } });
  };

  const handleQuickAnalyze = (type: string) => {
    router.push({ pathname: '/input', params: { type } });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#12146A" />

      {/* 온보딩 모달 */}
      {showOnboarding && (
        <Animated.View style={[styles.onboardingOverlay, { opacity: fadeAnim }]}>
          <Pressable style={styles.onboardingOverlay} onPress={dismissOnboarding}>
            <Pressable style={styles.onboardingCard} onPress={() => {}}>
              <View style={styles.onboardingIconBg}>
                <Feather name="bar-chart-2" size={28} color={Colors.primary} />
              </View>
              <Text style={styles.onboardingTitle}>투자 정보, 그냥 믿지 마세요</Text>
              <Text style={styles.onboardingBody}>
                뉴스 기사·스크린샷·유튜브 영상을{'\n'}
                AI로 분석해 <Text style={styles.onboardingEmphasis}>신뢰도</Text>를 점수로 보여드려요.{'\n\n'}
                다양한 플랫폼의 투자 정보를{'\n'}
                한 곳에서 저장하고 비교해보세요.
              </Text>
              <View style={styles.onboardingFeatures}>
                {[
                  { icon: 'link' as const, text: '뉴스 기사 링크 분석' },
                  { icon: 'image' as const, text: '스크린샷 OCR 분석' },
                  { icon: 'youtube' as const, text: '유튜브 영상 분석' },
                ].map((f) => (
                  <View key={f.text} style={styles.onboardingFeatureRow}>
                    <Feather name={f.icon} size={14} color={Colors.primary} />
                    <Text style={styles.onboardingFeatureText}>{f.text}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity style={styles.onboardingBtn} onPress={dismissOnboarding} activeOpacity={0.85}>
                <Text style={styles.onboardingBtnText}>확인, 시작할게요</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Animated.View>
      )}

      {/* 헤더 */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Image
          source={require('@/assets/images/kitch-logo-transparent.png')}
          style={styles.logo}
          tintColor="#FFFFFF"
          resizeMode="contain"
        />
        <TouchableOpacity style={styles.bellBtn}>
          <Feather name="bell" size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </View>

      {/* 콘텐츠 */}
      <View style={{ flex: 1 }}>
        {history.length === 0 ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.emptyScroll, { paddingBottom: 100 }]}
          >
            {/* 환영 배너 */}
            <View style={styles.heroBanner}>
              <View style={[styles.heroIcon, { backgroundColor: '#EEF0FF' }]}>
                <Feather name="cpu" size={22} color={Colors.primary} />
              </View>
              <Text style={styles.heroTitle}>AI가 투자 정보를 분석해드려요</Text>
              <Text style={styles.heroSubtitle}>
                뉴스 기사, 스크린샷, 유튜브 영상 링크를{'\n'}붙여넣으면 신뢰도·종목·투자 심리를{'\n'}자동으로 분석합니다.
              </Text>
            </View>

            {/* 사용 방법 */}
            <Text style={styles.howTitle}>이렇게 사용하세요</Text>
            <View style={styles.stepList}>
              {[
                { icon: 'link' as const, type: 'news', title: '뉴스 기사 URL 붙여넣기', desc: '한국경제, 연합뉴스, Bloomberg 등 기사 주소', bg: Colors.primaryBg, color: Colors.primary },
                { icon: 'image' as const, type: 'screenshot', title: '스크린샷 업로드', desc: '실적표, 리포트, 차트 이미지를 바로 분석', bg: '#F3EEFF', color: '#7C3AED' },
                { icon: 'youtube' as const, type: 'youtube', title: '유튜브 링크 붙여넣기', desc: '투자 분석 영상의 요약·신뢰도를 한 번에', bg: '#FFF0F0', color: '#EF4444' },
              ].map((s, i, arr) => (
                <TouchableOpacity
                  key={s.type}
                  style={[styles.stepRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}
                  activeOpacity={0.75}
                  onPress={() => handleQuickAnalyze(s.type)}
                >
                  <View style={[styles.stepIconBg, { backgroundColor: s.bg }]}>
                    <Feather name={s.icon} size={18} color={s.color} />
                  </View>
                  <View style={styles.stepText}>
                    <Text style={styles.stepTitle}>{s.title}</Text>
                    <Text style={styles.stepDesc}>{s.desc}</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={Colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.historyHint}>
              <Feather name="clock" size={13} color={Colors.textTertiary} />
              <Text style={styles.historyHintText}>분석이 완료되면 이 화면에 기록이 저장됩니다</Text>
            </View>
          </ScrollView>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scroll, { paddingBottom: 80 }]}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>내 분석 기록</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{history.length}</Text>
              </View>
            </View>
            {history.map((item) => (
              <HistoryCard
                key={item.id}
                item={item}
                onPress={() => handleViewResult(item)}
                onDelete={() => deleteFromHistory(item.id)}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* 분석 시작하기 버튼 */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.85}
          onPress={() => router.push('/analyze-sheet')}
        >
          <Feather name="zap" size={17} color="#fff" />
          <Text style={styles.fabText}>분석 시작하기</Text>
        </TouchableOpacity>
      </View>
      <KiwoomBottomBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  /* 온보딩 오버레이 */
  onboardingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 100, paddingHorizontal: 24,
  },
  onboardingCard: {
    width: '100%', backgroundColor: Colors.surface,
    borderRadius: 24, padding: 28,
    alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2, shadowRadius: 32, elevation: 16,
  },
  onboardingIconBg: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  onboardingTitle: {
    fontFamily: 'Inter_700Bold', fontSize: 20, color: Colors.text,
    textAlign: 'center',
  },
  onboardingBody: {
    fontFamily: 'Inter_400Regular', fontSize: 14,
    color: Colors.textSecondary, textAlign: 'center',
    lineHeight: 22,
  },
  onboardingEmphasis: {
    fontFamily: 'Inter_700Bold', color: Colors.primary,
  },
  onboardingFeatures: {
    alignSelf: 'stretch',
    backgroundColor: Colors.primaryBg,
    borderRadius: 14, padding: 16, gap: 10,
    marginVertical: 4,
  },
  onboardingFeatureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  onboardingFeatureText: {
    fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.text,
  },
  onboardingBtn: {
    alignSelf: 'stretch', backgroundColor: Colors.primary,
    borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', marginTop: 4,
  },
  onboardingBtnText: {
    fontFamily: 'Inter_700Bold', fontSize: 16, color: '#fff',
  },

  /* 헤더 */
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: '#12146A',
  },
  logo: { flex: 1, height: 36 },
  bellBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },

  emptyScroll: { paddingHorizontal: 20, paddingTop: 20 },

  heroBanner: {
    backgroundColor: Colors.surface,
    borderRadius: 20, padding: 24,
    alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: Colors.border,
    marginBottom: 24,
  },
  heroIcon: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  heroTitle: {
    fontFamily: 'Inter_700Bold', fontSize: 17, color: Colors.text,
    textAlign: 'center', lineHeight: 24,
  },
  heroSubtitle: {
    fontFamily: 'Inter_400Regular', fontSize: 13,
    color: Colors.textSecondary, textAlign: 'center', lineHeight: 21,
  },

  howTitle: {
    fontFamily: 'Inter_600SemiBold', fontSize: 13,
    color: Colors.textSecondary, marginBottom: 10,
    letterSpacing: 0.3,
  },
  stepList: {
    backgroundColor: Colors.surface,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden', marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  stepIconBg: {
    width: 42, height: 42, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  stepText: { flex: 1, gap: 2 },
  stepTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.text },
  stepDesc: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },

  historyHint: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8,
  },
  historyHintText: {
    fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textTertiary,
  },

  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, color: Colors.text },
  badge: {
    backgroundColor: Colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  badgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#fff' },

  fabContainer: {
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  fab: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  fabText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#fff' },
});
