// 홈 화면 - InvestLens 메인 진입점
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { UploadButton } from '@/components/UploadButton';
import { useAnalysisHistory } from '@/hooks/useAnalysisHistory';
import { HistoryCard } from '@/components/HistoryCard';
import { HistoryItem } from '@/hooks/useAnalysisHistory';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { history, deleteFromHistory } = useAnalysisHistory();

  const handleViewResult = (item: HistoryItem) => {
    router.push({ pathname: '/result', params: { historyId: item.id, cached: 'true' } });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <View>
            <View style={styles.logoRow}>
              <LinearGradient
                colors={['#4B5FD6', '#22C55E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoIcon}
              >
                <Feather name="search" size={18} color="#fff" />
              </LinearGradient>
              <Text style={styles.appTitle}>InvestLens</Text>
            </View>
            <Text style={styles.tagline}>AI 기반 투자 정보 분석 서비스</Text>
          </View>
          <TouchableOpacity style={styles.historyIcon} activeOpacity={0.7}>
            <Feather name="bell" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* 히어로 배너 */}
        <LinearGradient
          colors={['#2D3A9E', '#4B5FD6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          <View style={styles.heroBannerContent}>
            <Text style={styles.heroTitle}>어떤 투자 정보든 AI가 분석해드립니다</Text>
            <Text style={styles.heroSubtitle}>
              뉴스 링크, 스크린샷, 유튜브 영상을 입력하면 AI가 즉시 핵심 인사이트를 제공합니다.
            </Text>
          </View>
          <View style={styles.heroStats}>
            {[
              { label: '뉴스', icon: 'link' as const },
              { label: '스크린샷', icon: 'image' as const },
              { label: '유튜브', icon: 'youtube' as const },
            ].map(({ label, icon }) => (
              <View key={label} style={styles.heroStat}>
                <Feather name={icon} size={16} color="rgba(255,255,255,0.9)" />
                <Text style={styles.heroStatLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* 분석 섹션 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>분석 시작하기</Text>

          <UploadButton
            label="뉴스 링크 붙여넣기"
            sublabel="기사 URL을 입력하면 AI가 요약해드립니다"
            icon="link"
            onPress={() => router.push({ pathname: '/input', params: { type: 'news' } })}
            variant="primary"
          />
          <UploadButton
            label="스크린샷 업로드"
            sublabel="차트, 실적표, 보고서 이미지 분석"
            icon="image"
            onPress={() => router.push({ pathname: '/input', params: { type: 'screenshot' } })}
            variant="secondary"
          />
          <UploadButton
            label="유튜브 영상 분석"
            sublabel="투자 관련 영상 링크를 붙여넣으세요"
            icon="youtube"
            onPress={() => router.push({ pathname: '/input', params: { type: 'youtube' } })}
            variant="secondary"
          />
        </View>

        {/* 주의사항 */}
        <View style={styles.disclaimer}>
          <Feather name="info" size={12} color={Colors.textTertiary} />
          <Text style={styles.disclaimerText}>
            본 서비스는 교육 목적으로만 제공됩니다. 투자 권유가 아닙니다.
          </Text>
        </View>

        {/* 최근 분석 기록 */}
        {history.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>최근 분석 기록</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionCount}>{history.length}건</Text>
              </View>
            </View>
            {history.slice(0, 5).map((item) => (
              <HistoryCard
                key={item.id}
                item={item}
                onPress={() => handleViewResult(item)}
                onDelete={() => deleteFromHistory(item.id)}
              />
            ))}
            {history.length > 5 && (
              <TouchableOpacity style={styles.viewMore} activeOpacity={0.7}>
                <Text style={styles.viewMoreText}>전체 {history.length}건 보기</Text>
                <Feather name="chevron-right" size={14} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* 빈 상태 */}
        {history.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Feather name="bar-chart-2" size={32} color={Colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>분석 기록이 없습니다</Text>
            <Text style={styles.emptySubtitle}>
              위의 버튼을 눌러 뉴스 링크, 스크린샷, 또는 유튜브 영상을 분석해보세요.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  logoIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  appTitle: { fontFamily: 'Inter_700Bold', fontSize: 24, color: Colors.text, letterSpacing: -0.5 },
  tagline: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary, marginLeft: 46 },
  historyIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  heroBanner: { borderRadius: 20, padding: 20, marginBottom: 28 },
  heroBannerContent: { marginBottom: 16 },
  heroTitle: { fontFamily: 'Inter_700Bold', fontSize: 17, color: '#fff', marginBottom: 8, letterSpacing: -0.3, lineHeight: 24 },
  heroSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 19 },
  heroStats: { flexDirection: 'row', gap: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  heroStat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroStatLabel: { fontFamily: 'Inter_500Medium', fontSize: 13, color: 'rgba(255,255,255,0.9)' },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 17, color: Colors.text, marginBottom: 14 },
  sectionBadge: {
    backgroundColor: Colors.surface, paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.border, marginBottom: 14,
  },
  sectionCount: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: Colors.textSecondary },
  disclaimer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 },
  disclaimerText: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textTertiary },
  viewMore: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.border,
  },
  viewMoreText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.primary },
  emptyState: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: Colors.text },
  emptySubtitle: {
    fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary,
    textAlign: 'center', lineHeight: 19, paddingHorizontal: 20,
  },
});
