import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ScrollView, StatusBar, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LEFT_MENU = [
  '국내주식', '해외주식', '파생상품', '주식\n더모으기',
  '금융상품', '생활/혜택', '환전', '대출/\n카드/보험', '자산/뱅킹',
];

const GRID_ITEMS = [
  { label: '관심종목', highlight: false },
  { label: '현재가', highlight: false },
  { label: '주문', highlight: false },
  { label: '차트', highlight: false },
  { label: '계좌', highlight: false },
  { label: '종합뉴스', highlight: false },
  { label: 'KITCH', highlight: true, isKitch: true },
  { label: '투자정보', highlight: false },
  { label: '주식분석', highlight: false },
  { label: '투자자별', highlight: false },
  { label: '빅데이터', highlight: false },
  { label: '기업정보', highlight: false },
  { label: '조건검색', highlight: false },
  { label: '미수반대', highlight: false },
  { label: '커뮤니티', highlight: false },
  { label: '자동일지', highlight: false },
  { label: 'ETF분석', highlight: false },
  { label: '캐치(모의)', highlight: false },
  { label: '캐치(실전)', highlight: false },
  { label: '소수점', highlight: false },
  { label: '투자분석', highlight: false },
  { label: '주식대여', highlight: false },
  { label: '공모주', highlight: false },
];

export default function KiwoomMenu() {
  const insets = useSafeAreaInsets();
  const [activeLeft, setActiveLeft] = useState('국내주식');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* 상단 헤더 */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.chatIcon}>
            <Feather name="message-circle" size={16} color="#fff" />
          </View>
        </View>
        <View style={styles.searchBar}>
          <Text style={styles.searchText}>메뉴·종목 검색 가능</Text>
          <Feather name="mic" size={16} color="#9898A8" />
        </View>
        <View style={styles.headerIcons}>
          <Feather name="bell" size={18} color="#1A1A2E" />
          <Feather name="gift" size={18} color="#1A1A2E" />
          <Feather name="settings" size={18} color="#1A1A2E" />
        </View>
      </View>

      <View style={styles.body}>
        {/* 왼쪽 사이드바 */}
        <View style={styles.sidebar}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {LEFT_MENU.map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.sidebarItem, activeLeft === item.replace('\n', '') && styles.sidebarItemActive]}
                onPress={() => setActiveLeft(item.replace('\n', ''))}
              >
                <Text style={[
                  styles.sidebarText,
                  activeLeft === item.replace('\n', '') && styles.sidebarTextActive
                ]}>{item}</Text>
              </TouchableOpacity>
            ))}

            {/* AI챗봇 */}
            <View style={styles.aiBot}>
              <View style={styles.aiBotIcon}>
                <Text style={{ fontSize: 10, color: '#fff' }}>AI</Text>
              </View>
              <Text style={styles.aiBotText}>AI챗봇{'\n'}키우Me</Text>
            </View>

            <View style={styles.accountBtn}>
              <Text style={styles.accountBtnText}>계좌개설</Text>
            </View>
          </ScrollView>
        </View>

        {/* 오른쪽 콘텐츠 */}
        <View style={styles.content}>
          {/* 배너 */}
          <View style={styles.modeBanner}>
            <Text style={styles.modeBannerText}>쉬운 투자, 쉬운 경험 </Text>
            <Text style={styles.modeBannerAccent}>간편모드</Text>
            <Text style={styles.modeBannerText}>를 이용해보세요!</Text>
            <TouchableOpacity style={styles.modeToggle}>
              <Text style={styles.modeToggleText}>일반</Text>
            </TouchableOpacity>
            <Text style={styles.modeToggleDivider}>간편</Text>
          </View>

          <Text style={styles.contentTitle}>국내주식</Text>

          {/* 드롭다운 */}
          <TouchableOpacity style={styles.dropdown}>
            <Text style={styles.dropdownText}>주식/ETF/ETN</Text>
            <Feather name="chevron-down" size={14} color="#64647A" />
          </TouchableOpacity>

          {/* 그리드 메뉴 */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 70 }}>
            <View style={styles.grid}>
              {GRID_ITEMS.map((item) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.gridItem, item.isKitch && styles.gridItemKitch]}
                  onPress={() => item.isKitch && router.push('/kitch-home')}
                  activeOpacity={item.isKitch ? 0.7 : 0.9}
                >
                  {item.isKitch && (
                    <View style={styles.kitchBadge}>
                      <Text style={styles.kitchBadgeText}>NEW</Text>
                    </View>
                  )}
                  <Text style={[styles.gridItemText, item.isKitch && styles.gridItemTextKitch]}>
                    {item.label}
                  </Text>
                  {item.isKitch && (
                    <Text style={styles.kitchSub}>AI 투자 분석</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>

      {/* 하단 탭바 */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom }]}>
        <TouchableOpacity style={styles.tabBarItem} onPress={() => router.back()}>
          <Feather name="x" size={18} color="#64647A" />
        </TouchableOpacity>
        {['HOME', 'MY', '알림센터', '인증/보안', '고객센터', '로그아웃'].map(item => (
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
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingBottom: 10,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E0E0EC',
  },
  headerLeft: {},
  chatIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#5B35B5', alignItems: 'center', justifyContent: 'center',
  },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F5F5FA', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  searchText: { flex: 1, fontSize: 13, color: '#9898A8' },
  headerIcons: { flexDirection: 'row', gap: 12 },

  body: { flex: 1, flexDirection: 'row' },

  sidebar: {
    width: 80, backgroundColor: '#1A1464',
    paddingTop: 8,
  },
  sidebarItem: {
    paddingVertical: 12, paddingHorizontal: 8,
    alignItems: 'center',
  },
  sidebarItemActive: { backgroundColor: '#FFFFFF' },
  sidebarText: {
    fontSize: 11, color: 'rgba(255,255,255,0.7)',
    textAlign: 'center', lineHeight: 15,
  },
  sidebarTextActive: { color: '#1A1464', fontWeight: '700' },

  aiBot: {
    margin: 8, backgroundColor: '#2A2490', borderRadius: 8,
    padding: 8, alignItems: 'center',
  },
  aiBotIcon: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#5B35B5', alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  aiBotText: { fontSize: 9, color: '#fff', textAlign: 'center', lineHeight: 13 },

  accountBtn: {
    margin: 8, backgroundColor: '#5B35B5',
    borderRadius: 8, padding: 8, alignItems: 'center',
  },
  accountBtnText: { fontSize: 11, color: '#fff', fontWeight: '700' },

  content: { flex: 1, backgroundColor: '#F5F5FA' },

  modeBanner: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
    padding: 10, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E0E0EC', gap: 2,
  },
  modeBannerText: { fontSize: 11, color: '#64647A' },
  modeBannerAccent: { fontSize: 11, color: '#5B35B5', fontWeight: '700' },
  modeToggle: {
    backgroundColor: '#5B35B5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  modeToggleText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  modeToggleDivider: { fontSize: 11, color: '#64647A' },

  contentTitle: {
    fontSize: 14, fontWeight: '700', color: '#1A1A2E',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E0E0EC',
  },

  dropdown: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 1,
  },
  dropdownText: { fontSize: 13, color: '#1A1A2E' },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    backgroundColor: '#FFFFFF', gap: 1,
  },
  gridItem: {
    width: '49.7%', paddingVertical: 14, paddingHorizontal: 12,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F8',
    position: 'relative',
  },
  gridItemKitch: {
    backgroundColor: '#F0EBFF',
    borderWidth: 1, borderColor: '#5B35B5',
    borderRadius: 4,
  },
  gridItemText: { fontSize: 13, color: '#1A1A2E', fontWeight: '500' },
  gridItemTextKitch: { color: '#5B35B5', fontWeight: '700', fontSize: 14 },
  kitchSub: { fontSize: 10, color: '#7B5BD4', marginTop: 2 },
  kitchBadge: {
    position: 'absolute', top: 6, right: 8,
    backgroundColor: '#E22C29', paddingHorizontal: 5, paddingVertical: 1,
    borderRadius: 4,
  },
  kitchBadgeText: { fontSize: 9, color: '#fff', fontWeight: '700' },

  tabBar: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: '#E0E0EC', paddingTop: 6,
  },
  tabBarItem: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  tabBarText: { fontSize: 9, color: '#64647A' },
});
