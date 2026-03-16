import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ScrollView, StatusBar, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STOCKS = [
  { rank: 1, name: '지투지바이오',    price: '102,400', change: '▼ 13.80%', up: false },
  { rank: 2, name: '삼성전자',        price: '187,500', change: '▲ 2.18%',  up: true  },
  { rank: 3, name: 'SK하이닉스',      price: '959,000', change: '▲ 5.38%',  up: true  },
  { rank: 4, name: '흥아해운',        price: '3,015',   change: '▲ 29.12%', up: true  },
  { rank: 5, name: '카나프테라퓨틱스', price: '57,700',  change: '▲ 188.5%', up: true  },
];

const TAGS = ['#지투지바이오', '#삼성전자', '#SK하이닉스', '#흥아'];

const BIG_DATA_TABS = ['실시간 조회', '조회수 급증', '매매 상위'];
const MAIN_TABS = ['국내', '해외', '상품'];

export default function KiwoomHome() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('실시간 조회');
  const [mainTab, setMainTab] = useState('국내');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* ── 헤더 ── */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        {/* 왼쪽: 뒤로 + 모드 토글 */}
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn}>
            <Feather name="chevron-left" size={20} color="#1A1A2E" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.modePill}>
            <Text style={styles.modePillText}>일반</Text>
          </TouchableOpacity>
          <Text style={styles.modePlain}>간편</Text>
        </View>

        {/* 오른쪽: 이벤트 배너 */}
        <TouchableOpacity style={styles.eventBanner}>
          <View>
            <Text style={styles.eventSmall}>휴면고객 초대 이벤트</Text>
            <Text style={styles.eventBig}>친구야 다시{'\n'}키움하자!</Text>
          </View>
          <Text style={styles.eventEmoji}>🐾</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.moreBtn}>
          <Feather name="more-vertical" size={18} color="#64647A" />
        </TouchableOpacity>
      </View>

      {/* ── 국내/해외/상품 탭 ── */}
      <View style={styles.mainTabs}>
        {MAIN_TABS.map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.mainTab, mainTab === t && styles.mainTabActive]}
            onPress={() => setMainTab(t)}
          >
            <Text style={[styles.mainTabText, mainTab === t && styles.mainTabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 70 }}>

        {/* ── 검색바 ── */}
        <View style={styles.searchBar}>
          <Feather name="search" size={15} color="#B0B0C0" />
          <Text style={styles.searchPlaceholder}>종목·메뉴를 검색해주세요</Text>
          <Feather name="mic" size={15} color="#B0B0C0" />
        </View>

        {/* ── 해시태그 ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={styles.tagRow} contentContainerStyle={{ paddingHorizontal: 14, gap: 6 }}>
          {TAGS.map(tag => (
            <TouchableOpacity key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── 포인트 배너 ── */}
        <TouchableOpacity style={styles.pointBanner} activeOpacity={0.85}>
          <Text style={styles.pointBannerText}>[키움포인트] 주식살때 보태드려요!</Text>
        </TouchableOpacity>

        {/* ── 빅데이터 ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>빅데이터</Text>
            <View style={styles.cardActions}>
              <Feather name="refresh-cw" size={13} color="#9898A8" />
              <Feather name="chevron-right" size={13} color="#9898A8" style={{ marginLeft: 10 }} />
            </View>
          </View>

          {/* 필터 탭 */}
          <View style={styles.filterRow}>
            {BIG_DATA_TABS.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.filterBtn, activeTab === t && styles.filterBtnActive]}
                onPress={() => setActiveTab(t)}
              >
                <Text style={[styles.filterBtnText, activeTab === t && styles.filterBtnTextActive]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 종목 목록 */}
          {STOCKS.map(s => (
            <View key={s.rank} style={styles.stockRow}>
              <Text style={styles.stockRank}>{s.rank}</Text>
              <Text style={styles.stockName}>{s.name}</Text>
              <Text style={styles.stockPrice}>{s.price}</Text>
              <Text style={[styles.stockChange, { color: s.up ? '#E22C29' : '#0052CC' }]}>
                {s.up ? '▲' : '▼'} {s.change.replace('▲ ', '').replace('▼ ', '')}
              </Text>
            </View>
          ))}
        </View>

        {/* ── 순위 검색 ── */}
        <View style={styles.indexSection}>
          <Text style={styles.indexSectionTitle}>순위 검색</Text>
          <View style={styles.indexRow}>
            <View style={styles.indexBadge}>
              <Text style={styles.indexBadgeText}>지수</Text>
            </View>
            <Text style={styles.indexName}>코스닥</Text>
            <Text style={styles.indexValue}>1,133.79</Text>
            <Text style={[styles.indexChange, { color: '#0052CC' }]}>▼ 19.17</Text>
            <Text style={[styles.indexChangePct, { color: '#0052CC' }]}>1.66%</Text>
          </View>
        </View>
      </ScrollView>

      {/* ── 하단 탭바 ── */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom }]}>
        <TouchableOpacity style={styles.menuBtn} onPress={() => router.push('/kiwoom-menu')}>
          <Feather name="menu" size={18} color="#FFFFFF" />
          <Text style={styles.menuBtnText}>메뉴</Text>
        </TouchableOpacity>
        {['관심종목', '현재가', '주문', '차트', '계좌', '종합'].map(item => (
          <TouchableOpacity key={item} style={styles.tabBarItem}>
            <Text style={styles.tabBarText}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  /* 헤더 */
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingBottom: 8,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backBtn: { paddingRight: 2 },
  modePill: {
    backgroundColor: '#5B35B5', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12,
  },
  modePillText: { fontSize: 12, color: '#fff', fontWeight: '700' },
  modePlain: { fontSize: 12, color: '#64647A', fontWeight: '500' },

  eventBanner: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    backgroundColor: '#FFF5E6', borderRadius: 8, marginLeft: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  eventSmall: { fontSize: 9, color: '#E07020', fontWeight: '600' },
  eventBig:  { fontSize: 12, color: '#1A1A2E', fontWeight: '800', lineHeight: 16 },
  eventEmoji: { fontSize: 20, marginLeft: 4 },
  moreBtn: { paddingLeft: 10 },

  /* 메인 탭 */
  mainTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1, borderBottomColor: '#E8E8F0',
  },
  mainTab: { paddingHorizontal: 22, paddingVertical: 10 },
  mainTabActive: { borderBottomWidth: 2, borderBottomColor: '#1A1A2E' },
  mainTabText: { fontSize: 14, color: '#9898A8', fontWeight: '500' },
  mainTabTextActive: { color: '#1A1A2E', fontWeight: '700' },

  /* 검색바 */
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 14, marginTop: 12, marginBottom: 4,
    backgroundColor: '#F5F5FA', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 9,
  },
  searchPlaceholder: { flex: 1, fontSize: 13, color: '#B0B0C0' },

  /* 해시태그 */
  tagRow: { marginVertical: 8 },
  tag: {
    backgroundColor: '#F0EBFF', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: { fontSize: 12, color: '#5B35B5', fontWeight: '500' },

  /* 포인트 배너 */
  pointBanner: {
    marginHorizontal: 14, marginBottom: 14,
    backgroundColor: '#12146A', borderRadius: 6,
    paddingVertical: 11, paddingHorizontal: 14,
  },
  pointBannerText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },

  /* 빅데이터 카드 */
  card: { marginHorizontal: 14, marginBottom: 12 },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  cardActions: { flexDirection: 'row', alignItems: 'center' },

  filterRow: { flexDirection: 'row', gap: 4, marginBottom: 12 },
  filterBtn: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4,
    backgroundColor: '#F5F5FA',
  },
  filterBtnActive: { backgroundColor: '#12146A' },
  filterBtnText: { fontSize: 12, color: '#64647A', fontWeight: '500' },
  filterBtnTextActive: { color: '#FFFFFF', fontWeight: '700' },

  stockRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F0F0F8',
  },
  stockRank: { width: 18, fontSize: 13, color: '#64647A', fontWeight: '600' },
  stockName: { flex: 1, fontSize: 13, color: '#1A1A2E', fontWeight: '500', marginLeft: 6 },
  stockPrice: { fontSize: 13, color: '#1A1A2E', fontWeight: '600', marginRight: 6 },
  stockChange: { fontSize: 12, fontWeight: '500', width: 86, textAlign: 'right' },

  /* 순위 검색 */
  indexSection: { marginHorizontal: 14, marginBottom: 8 },
  indexSectionTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  indexRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F5F5FA', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  indexBadge: {
    backgroundColor: '#DCEEFF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  indexBadgeText: { fontSize: 10, color: '#0052CC', fontWeight: '700' },
  indexName: { flex: 1, fontSize: 13, color: '#1A1A2E', fontWeight: '500' },
  indexValue: { fontSize: 13, color: '#1A1A2E', fontWeight: '600' },
  indexChange: { fontSize: 12, fontWeight: '500' },
  indexChangePct: { fontSize: 12, fontWeight: '500' },

  /* 하단 탭바 */
  tabBar: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: '#E8E8F0', paddingTop: 6,
  },
  menuBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#5B35B5', marginHorizontal: 4, marginBottom: 2,
    borderRadius: 8, paddingVertical: 4,
  },
  menuBtnText: { fontSize: 9, color: '#fff', fontWeight: '700', marginTop: 1 },
  tabBarItem: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  tabBarText: { fontSize: 10, color: '#64647A' },
});
