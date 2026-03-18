import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { KiwoomBottomBar } from '@/components/KiwoomBottomBar';
import {
  Image, ScrollView, StatusBar, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useAnalysisHistory } from '@/hooks/useAnalysisHistory';
import { HistoryCard } from '@/components/HistoryCard';
import { HistoryItem } from '@/hooks/useAnalysisHistory';

const QUICK_ACTIONS = [
  {
    type: 'news',
    icon: 'link' as const,
    label: '뉴스 기사',
    color: Colors.primary,
    bg: Colors.primaryBg,
  },
  {
    type: 'screenshot',
    icon: 'image' as const,
    label: '스크린샷',
    color: '#7C3AED',
    bg: '#F3EEFF',
  },
  {
    type: 'youtube',
    icon: 'youtube' as const,
    label: '유튜브',
    color: '#EF4444',
    bg: '#FFF0F0',
  },
];

export default function KitchHome() {
  const insets = useSafeAreaInsets();
  const { history, deleteFromHistory } = useAnalysisHistory();

  const handleViewResult = (item: HistoryItem) => {
    router.push({ pathname: '/result', params: { historyId: item.id, cached: 'true' } });
  };

  const handleQuickAnalyze = (type: string) => {
    router.push({ pathname: '/input', params: { type } });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#12146A" />

      {/* 헤더 */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.replace('/')} style={styles.backBtn}>
          <Feather name="chevron-left" size={22} color="#FFFFFF" />
        </TouchableOpacity>
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

      {/* 빠른 분석 진입 */}
      <View style={styles.quickBar}>
        <Text style={styles.quickBarLabel}>분석 유형 선택</Text>
        <View style={styles.quickActions}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.type}
              style={[styles.quickBtn, { backgroundColor: action.bg, borderColor: action.color + '33' }]}
              activeOpacity={0.75}
              onPress={() => handleQuickAnalyze(action.type)}
            >
              <Feather name={action.icon} size={16} color={action.color} />
              <Text style={[styles.quickBtnText, { color: action.color }]}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
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
              <View style={styles.heroIconRow}>
                <View style={[styles.heroIcon, { backgroundColor: '#EEF0FF' }]}>
                  <Feather name="cpu" size={22} color={Colors.primary} />
                </View>
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
                { icon: 'link' as const, color: Colors.primary, bg: Colors.primaryBg, step: '1', title: '뉴스 기사 URL 붙여넣기', desc: '한국경제, 연합뉴스, Bloomberg 등 기사 주소' },
                { icon: 'image' as const, color: '#7C3AED', bg: '#F3EEFF', step: '2', title: '스크린샷 업로드', desc: '실적표, 리포트, 차트 이미지를 바로 분석' },
                { icon: 'youtube' as const, color: '#EF4444', bg: '#FFF0F0', step: '3', title: '유튜브 링크 붙여넣기', desc: '투자 분석 영상의 요약·신뢰도를 한 번에' },
              ].map((s) => (
                <TouchableOpacity
                  key={s.step}
                  style={styles.stepRow}
                  activeOpacity={0.75}
                  onPress={() => handleQuickAnalyze(s.icon === 'link' ? 'news' : s.icon === 'image' ? 'screenshot' : 'youtube')}
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

            {/* 분석 기록 안내 */}
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

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: '#12146A',
  },
  backBtn: { marginRight: 4 },
  logo: { flex: 1, height: 36 },
  bellBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },

  quickBar: {
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    gap: 10,
  },
  quickBarLabel: {
    fontFamily: 'Inter_500Medium', fontSize: 11,
    color: Colors.textTertiary, letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  quickActions: { flexDirection: 'row', gap: 8 },
  quickBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 12,
    borderWidth: 1,
  },
  quickBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },

  emptyScroll: { paddingHorizontal: 20, paddingTop: 20, gap: 0 },

  heroBanner: {
    backgroundColor: Colors.surface,
    borderRadius: 20, padding: 24,
    alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: Colors.border,
    marginBottom: 24,
  },
  heroIconRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  heroIcon: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
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
