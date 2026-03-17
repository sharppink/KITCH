// 키움증권 스타일 하단 바 (모든 화면 공통)
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TABS = ['종합뉴스', '투자정보', '주식분석', '투자자별', '뉴스검색', '리서치'];

interface Props {
  activeTab?: string;
}

export function KiwoomBottomBar({ activeTab }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom }]}>
      {/* 지수 ticker 줄 */}
      <View style={styles.tickerRow}>
        <View style={styles.tickerBadge}>
          <Text style={styles.tickerBadgeText}>지수</Text>
        </View>
        <Text style={styles.tickerLabel}>코스피</Text>
        <Text style={styles.tickerValue}>5,684.32</Text>
        <Text style={styles.tickerUp}>▲ 134.47</Text>
        <Text style={styles.tickerUpPct}>2.42%</Text>
      </View>

      {/* 탭 줄 */}
      <View style={styles.tabRow}>
        {/* 메뉴 버튼 */}
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={() => router.push('/kiwoom-menu')}
          activeOpacity={0.8}
        >
          <Feather name="menu" size={17} color="#FFFFFF" />
          <Text style={styles.menuBtnText}>메뉴</Text>
        </TouchableOpacity>

        {/* 스크롤 가능한 탭 목록 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScroll}
          style={styles.tabScrollView}
        >
          {TABS.map((tab) => {
            const isActive = tab === activeTab;
            return (
              <TouchableOpacity key={tab} style={styles.tabItem} activeOpacity={0.7}>
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab}
                </Text>
                {isActive && <View style={styles.tabUnderline} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0EC',
  },

  /* 지수 ticker */
  tickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F8',
    gap: 5,
  },
  tickerBadge: {
    backgroundColor: '#E8F0FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  tickerBadgeText: { fontSize: 10, color: '#0052CC', fontWeight: '700' },
  tickerLabel: { fontSize: 12, color: '#1A1A2E', fontWeight: '500' },
  tickerValue: { fontSize: 12, color: '#1A1A2E', fontWeight: '700' },
  tickerUp: { fontSize: 12, color: '#E22C29', fontWeight: '600' },
  tickerUpPct: { fontSize: 12, color: '#E22C29', fontWeight: '600' },

  /* 탭 줄 */
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },

  /* 메뉴 버튼 */
  menuBtn: {
    width: 48,
    paddingVertical: 6,
    backgroundColor: '#12146A',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    borderRadius: 5,
    gap: 1,
  },
  menuBtnText: { fontSize: 9, color: '#FFFFFF', fontWeight: '700' },

  /* 탭 스크롤 */
  tabScrollView: { flex: 1 },
  tabScroll: { alignItems: 'center', paddingHorizontal: 2, gap: 0 },
  tabItem: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    position: 'relative',
  },
  tabText: { fontSize: 12, color: '#64647A', fontWeight: '500' },
  tabTextActive: { color: '#12146A', fontWeight: '700' },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 6,
    right: 6,
    height: 2,
    backgroundColor: '#12146A',
    borderRadius: 1,
  },
});
