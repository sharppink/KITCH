import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
  Image,
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

const MOCK_FEED = [
  {
    id: '1',
    source: '한국경제',
    sourceIcon: '📰',
    title: '삼성전자, HBM4 양산 본격화…엔비디아에 공급 임박',
    sentiment: 'positive' as const,
    sentimentLabel: '긍정',
    time: '12분 전',
    tags: ['삼성전자', 'HBM', 'NVDA'],
  },
  {
    id: '2',
    source: '매일경제',
    sourceIcon: '📊',
    title: '미 연준, 금리 동결 결정…시장 반응 엇갈려',
    sentiment: 'neutral' as const,
    sentimentLabel: '중립',
    time: '34분 전',
    tags: ['연준', '금리', 'USD'],
  },
  {
    id: '3',
    source: '조선비즈',
    sourceIcon: '📈',
    title: 'SK하이닉스, 2분기 영업이익 전망치 상향 조정',
    sentiment: 'positive' as const,
    sentimentLabel: '긍정',
    time: '1시간 전',
    tags: ['SK하이닉스', '반도체'],
  },
  {
    id: '4',
    source: '이데일리',
    sourceIcon: '⚠️',
    title: '중국 경기 침체 우려…코스피 외국인 순매도 확대',
    sentiment: 'negative' as const,
    sentimentLabel: '부정',
    time: '2시간 전',
    tags: ['코스피', '중국', '외국인'],
  },
  {
    id: '5',
    source: '한국경제TV',
    sourceIcon: '🎥',
    title: '2차전지 업종 반등 신호…에코프로 강세 지속',
    sentiment: 'positive' as const,
    sentimentLabel: '긍정',
    time: '3시간 전',
    tags: ['에코프로', '2차전지'],
  },
];

const SENTIMENT_COLORS = {
  positive: Colors.positive,
  negative: Colors.negative,
  neutral: Colors.warning,
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { history } = useAnalysisHistory();

  const handleViewResult = (item: HistoryItem) => {
    router.push({ pathname: '/result', params: { historyId: item.id, cached: 'true' } });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* 헤더 */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Image
          source={require('@/assets/images/kitch-logo-transparent.png')}
          style={styles.logo}
          tintColor="#FFFFFF"
          resizeMode="contain"
        />
        <TouchableOpacity style={styles.bellBtn} activeOpacity={0.7}>
          <Feather name="bell" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
      >
        {/* 섹션: 투자 정보 피드 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>투자 정보</Text>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>실시간</Text>
        </View>

        {MOCK_FEED.map((item) => (
          <TouchableOpacity key={item.id} style={styles.feedCard} activeOpacity={0.75}>
            <View style={styles.feedTop}>
              <View style={styles.sourceRow}>
                <Text style={styles.sourceIcon}>{item.sourceIcon}</Text>
                <Text style={styles.sourceName}>{item.source}</Text>
                <Text style={styles.feedTime}>{item.time}</Text>
              </View>
              <View style={[styles.sentimentDot, { backgroundColor: SENTIMENT_COLORS[item.sentiment] }]} />
            </View>
            <Text style={styles.feedTitle}>{item.title}</Text>
            <View style={styles.tagRow}>
              {item.tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        ))}

        {/* 분석 기록 */}
        {history.length > 0 && (
          <View style={{ marginTop: 8 }}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>내 분석 기록</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{history.length}</Text>
              </View>
            </View>
            {history.slice(0, 3).map((item) => (
              <HistoryCard
                key={item.id}
                item={item}
                onPress={() => handleViewResult(item)}
                onDelete={() => {}}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* 분석 시작하기 FAB */}
      <View style={[styles.fabContainer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.85}
          onPress={() => router.push('/analyze-sheet')}
        >
          <Feather name="zap" size={18} color="#fff" />
          <Text style={styles.fabText}>분석 시작하기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  logo: { width: 100, height: 32 },
  bellBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },

  scroll: { paddingHorizontal: 16, paddingTop: 20 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14,
  },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, color: Colors.text },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.positive },
  liveText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.positive },
  badge: {
    backgroundColor: Colors.primary, paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 10, marginLeft: 2,
  },
  badgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#fff' },

  feedCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16, padding: 16,
    marginBottom: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  feedTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sourceIcon: { fontSize: 13 },
  sourceName: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.textSecondary },
  feedTime: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textTertiary },
  sentimentDot: { width: 8, height: 8, borderRadius: 4 },

  feedTitle: {
    fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.text,
    lineHeight: 21, marginBottom: 10,
  },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    backgroundColor: Colors.surfaceElevated, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
  },
  tagText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: Colors.textSecondary },

  fabContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },
  fab: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: Colors.primary, borderRadius: 18,
    paddingVertical: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  fabText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#fff', letterSpacing: 0.2 },
});
