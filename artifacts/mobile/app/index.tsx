import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ScrollView, StatusBar, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STOCKS = [
  { rank: 1, name: '지투지바이오', price: '102,400', change: '▼ 13.80%', up: false },
  { rank: 2, name: '삼성전자', price: '187,500', change: '▲ 2.18%', up: true },
  { rank: 3, name: 'SK하이닉스', price: '959,000', change: '▲ 5.38%', up: true },
  { rank: 4, name: '흥아해운', price: '3,015', change: '▲ 29.12%', up: true },
  { rank: 5, name: '카나프테라퓨틱스', price: '57,700', change: '▲ 188.5%', up: true },
];

const TAGS = ['#지투지바이오', '#삼성전자', '#SK하이닉스', '#흥아해운'];

export default function KiwoomHome() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('실시간 조회');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* 상단 헤더 */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.modeBtn}>
            <Text style={styles.modeBtnText}>일반</Text>
          </TouchableOpacity>
          <Text style={styles.modeDivider}>간편</Text>
        </View>
        <TouchableOpacity style={styles.headerRight}>
          <Text style={styles.eventText}>👋 친구야 다시 키움하자!</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Feather name="more-vertical" size={20} color="#1A1A2E" />
        </TouchableOpacity>
      </View>

      {/* 탭 */}
      <View style={styles.tabs}>
        {['국내', '해외', '상품'].map(t => (
          <TouchableOpacity key={t} style={[styles.tab, t === '국내' && styles.tabActive]}>
            <Text style={[styles.tabText, t === '국내' && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}>
        {/* 검색바 */}
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color="#9898A8" />
          <Text style={styles.searchPlaceholder}>종목·메뉴를 검색해주세요</Text>
          <Feather name="mic" size={16} color="#9898A8" />
        </View>

        {/* 해시태그 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagRow}>
          {TAGS.map(tag => (
            <TouchableOpacity key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 배너 */}
        <View style={styles.banner}>
          <Text style={styles.bannerText}>🏆 [키움포인트] 주식살때 보태드려요!</Text>
        </View>

        {/* 빅데이터 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>빅데이터</Text>
            <View style={styles.sectionActions}>
              <Feather name="refresh-cw" size={14} color="#64647A" />
              <Feather name="chevron-right" size={14} color="#64647A" style={{ marginLeft: 8 }} />
            </View>
          </View>

          <View style={styles.filterRow}>
            {['실시간 조회', '조회수 급증', '매매 상위'].map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.filterBtn, activeTab === t && styles.filterBtnActive]}
                onPress={() => setActiveTab(t)}
              >
                <Text style={[styles.filterBtnText, activeTab === t && styles.filterBtnTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {STOCKS.map(stock => (
            <View key={stock.rank} style={styles.stockRow}>
              <Text style={styles.stockRank}>{stock.rank}</Text>
              <Text style={styles.stockName}>{stock.name}</Text>
              <Text style={styles.stockPrice}>{stock.price}</Text>
              <Text style={[styles.stockChange, { color: stock.up ? '#E22C29' : '#0052CC' }]}>
                {stock.change}
              </Text>
            </View>
          ))}
        </View>

        {/* 슈위 검색 */}
        <View style={styles.indexRow}>
          <View style={[styles.indexIcon, { backgroundColor: '#E8F0FF' }]}>
            <Text style={{ fontSize: 10, color: '#0052CC', fontWeight: '700' }}>지수</Text>
          </View>
          <Text style={styles.indexName}>코스닥</Text>
          <Text style={styles.indexValue}>1,133.79</Text>
          <Text style={[styles.indexChange, { color: '#0052CC' }]}>▼ 19.17  1.66%</Text>
        </View>
      </ScrollView>

      {/* 하단 탭바 */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom }]}>
        <TouchableOpacity style={styles.tabBarItem} onPress={() => router.push('/kiwoom-menu')}>
          <View style={styles.menuIconBg}>
            <Feather name="menu" size={16} color="#FFFFFF" />
          </View>
          <Text style={styles.tabBarMenuText}>메뉴</Text>
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
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 8, gap: 8,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  modeBtn: {
    backgroundColor: '#5B35B5', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12,
  },
  modeBtnText: { fontSize: 12, color: '#fff', fontWeight: '700' },
  modeDivider: { fontSize: 12, color: '#64647A' },
  headerRight: { flex: 1 },
  eventText: { fontSize: 12, color: '#5B35B5', fontWeight: '600' },

  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E0E0EC' },
  tab: { paddingHorizontal: 20, paddingVertical: 10 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#5B35B5' },
  tabText: { fontSize: 14, color: '#9898A8', fontWeight: '500' },
  tabTextActive: { color: '#1A1A2E', fontWeight: '700' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 12, backgroundColor: '#F5F5FA',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
  },
  searchPlaceholder: { flex: 1, fontSize: 13, color: '#9898A8' },

  tagRow: { paddingHorizontal: 12, marginBottom: 10 },
  tag: {
    backgroundColor: '#F0EBFF', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, marginRight: 6,
  },
  tagText: { fontSize: 12, color: '#5B35B5', fontWeight: '500' },

  banner: {
    marginHorizontal: 12, marginBottom: 12,
    backgroundColor: '#1A1464', borderRadius: 8, padding: 12,
  },
  bannerText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },

  section: { paddingHorizontal: 12, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  sectionActions: { flexDirection: 'row', alignItems: 'center' },

  filterRow: { flexDirection: 'row', gap: 4, marginBottom: 12 },
  filterBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 6, backgroundColor: '#F5F5FA',
  },
  filterBtnActive: { backgroundColor: '#5B35B5' },
  filterBtnText: { fontSize: 12, color: '#64647A', fontWeight: '500' },
  filterBtnTextActive: { color: '#FFFFFF', fontWeight: '700' },

  stockRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F0F0F8',
  },
  stockRank: { width: 20, fontSize: 13, color: '#64647A', fontWeight: '600' },
  stockName: { flex: 1, fontSize: 13, color: '#1A1A2E', fontWeight: '500' },
  stockPrice: { fontSize: 13, color: '#1A1A2E', fontWeight: '600', marginRight: 8 },
  stockChange: { fontSize: 12, fontWeight: '500', width: 90, textAlign: 'right' },

  indexRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#F5F5FA', marginHorizontal: 12, borderRadius: 8,
  },
  indexIcon: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  indexName: { flex: 1, fontSize: 13, color: '#1A1A2E', fontWeight: '500' },
  indexValue: { fontSize: 13, color: '#1A1A2E', fontWeight: '600' },
  indexChange: { fontSize: 12 },

  tabBar: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: '#E0E0EC',
    paddingTop: 6,
  },
  tabBarItem: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  menuIconBg: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#5B35B5', alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  tabBarMenuText: { fontSize: 9, color: '#5B35B5', fontWeight: '700' },
  tabBarText: { fontSize: 10, color: '#64647A' },
});
