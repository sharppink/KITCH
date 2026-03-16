import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
  Image, ScrollView, StatusBar, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useAnalysisHistory } from '@/hooks/useAnalysisHistory';
import { HistoryCard } from '@/components/HistoryCard';
import { HistoryItem } from '@/hooks/useAnalysisHistory';

export default function KitchHome() {
  const insets = useSafeAreaInsets();
  const { history, deleteFromHistory } = useAnalysisHistory();

  const handleViewResult = (item: HistoryItem) => {
    router.push({ pathname: '/result', params: { historyId: item.id, cached: 'true' } });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* 헤더 */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Image
          source={require('@/assets/images/kitch-logo-transparent.png')}
          style={styles.logo}
          tintColor={Colors.primary}
          resizeMode="contain"
        />
        <TouchableOpacity style={styles.bellBtn}>
          <Feather name="bell" size={18} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* 서브헤더 배너 */}
      <View style={styles.subBanner}>
        <View style={styles.subBannerLeft}>
          <Feather name="zap" size={14} color={Colors.primary} />
          <Text style={styles.subBannerText}>AI 기반 투자 정보 분석 서비스</Text>
        </View>
      </View>

      {/* 콘텐츠 */}
      {history.length === 0 ? (
        <View style={styles.emptyWrapper}>
          <View style={styles.emptyIcon}>
            <Feather name="bar-chart-2" size={32} color={Colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>저장된 분석이 없습니다</Text>
          <Text style={styles.emptySubtitle}>
            아래 버튼을 눌러 뉴스 링크, 스크린샷,{'\n'}또는 유튜브 영상을 분석해보세요.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
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

      {/* 분석 시작하기 버튼 */}
      <View style={[styles.fabContainer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.85}
          onPress={() => router.push('/analyze-sheet')}
        >
          <Feather name="zap" size={17} color="#fff" />
          <Text style={styles.fabText}>분석 시작하기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { marginRight: 4 },
  logo: { flex: 1, height: 36 },
  bellBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
  },

  subBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: Colors.primaryBg,
    borderBottomWidth: 1, borderBottomColor: '#DDD5F8',
  },
  subBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  subBannerText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },

  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, color: Colors.text },
  badge: {
    backgroundColor: Colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  badgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#fff' },

  emptyWrapper: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingHorizontal: 40, paddingBottom: 80,
  },
  emptyIcon: {
    width: 68, height: 68, borderRadius: 20,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: Colors.text },
  emptySubtitle: {
    fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary,
    textAlign: 'center', lineHeight: 20,
  },

  fabContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16,
  },
  fab: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  fabText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#fff' },
});
