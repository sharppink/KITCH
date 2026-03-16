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

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { history, deleteFromHistory } = useAnalysisHistory();

  const handleViewResult = (item: HistoryItem) => {
    router.push({ pathname: '/result', params: { historyId: item.id, cached: 'true' } });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* 헤더 */}
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
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

      {/* 콘텐츠 */}
      {history.length === 0 ? (
        /* 빈 상태 */
        <View style={styles.emptyWrapper}>
          <View style={styles.emptyIcon}>
            <Feather name="bar-chart-2" size={36} color={Colors.textTertiary} />
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

      {/* 분석 시작하기 FAB */}
      <View style={[styles.fabContainer, { paddingBottom: insets.bottom + 20 }]}>
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  logo: { width: 140, height: 46 },
  bellBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },

  scroll: { paddingHorizontal: 16, paddingTop: 20 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14,
  },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 17, color: Colors.text },
  badge: {
    backgroundColor: Colors.primary, paddingHorizontal: 9, paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#fff' },

  emptyWrapper: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12,
    paddingHorizontal: 40, paddingBottom: 80,
  },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 17, color: Colors.text },
  emptySubtitle: {
    fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.textSecondary,
    textAlign: 'center', lineHeight: 21,
  },

  fabContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20,
  },
  fab: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: Colors.primary, borderRadius: 18,
    paddingVertical: 17,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  fabText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#fff', letterSpacing: 0.3 },
});
