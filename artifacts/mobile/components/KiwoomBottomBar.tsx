// 키움증권 스타일 하단 바 (모든 화면 공통)
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TABS = ['종합뉴스', '투자정보', '주식분석', '투자자별', '뉴스검색', '리서치'];

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : 'http://localhost:8080/api';

interface KospiData {
  name: string;
  price: number;
  change: number;
  changePct: number;
  isUp: boolean;
}

function formatNum(n: number, decimals = 2) {
  return n.toLocaleString('ko-KR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

interface Props {
  activeTab?: string;
}

export function KiwoomBottomBar({ activeTab }: Props) {
  const insets = useSafeAreaInsets();
  const [kospi, setKospi] = useState<KospiData | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchKospi = async () => {
    try {
      const res = await fetch(`${API_BASE}/market/kospi`);
      if (res.ok) {
        const data = await res.json();
        setKospi(data);
      }
    } catch {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKospi();
    intervalRef.current = setInterval(fetchKospi, 60 * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const priceColor = kospi ? (kospi.isUp ? '#E22C29' : '#0052CC') : '#1A1A2E';
  const arrow = kospi ? (kospi.isUp ? '▲' : '▼') : '';

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom }]}>
      {/* 지수 ticker 줄 */}
      <View style={styles.tickerRow}>
        <View style={styles.tickerBadge}>
          <Text style={styles.tickerBadgeText}>지수</Text>
        </View>
        <Text style={styles.tickerLabel}>코스피</Text>
        {loading ? (
          <ActivityIndicator size="small" color="#64647A" style={{ marginLeft: 4 }} />
        ) : kospi ? (
          <>
            <Text style={styles.tickerValue}>{formatNum(kospi.price)}</Text>
            <Text style={[styles.tickerChange, { color: priceColor }]}>
              {arrow} {formatNum(Math.abs(kospi.change))}
            </Text>
            <Text style={[styles.tickerChange, { color: priceColor }]}>
              {formatNum(Math.abs(kospi.changePct))}%
            </Text>
          </>
        ) : (
          <Text style={styles.tickerValue}>—</Text>
        )}
      </View>

      {/* 탭 줄 */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={() => router.push('/kiwoom-menu')}
          activeOpacity={0.8}
        >
          <Feather name="menu" size={17} color="#FFFFFF" />
          <Text style={styles.menuBtnText}>메뉴</Text>
        </TouchableOpacity>

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
  tickerChange: { fontSize: 12, fontWeight: '600' },

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
