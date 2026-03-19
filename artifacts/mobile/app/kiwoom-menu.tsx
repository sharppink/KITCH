import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ScrollView, StatusBar, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LEFT_CATEGORIES = [
  { id: '국내주식', label: '국내주식' },
  { id: '해외주식', label: '해외주식' },
  { id: '파생상품', label: '파생상품' },
  { id: '주식더모으기', label: '주식\n더모으기' },
  { id: '금융상품', label: '금융상품' },
  { id: '생활혜택', label: '생활/혜택' },
  { id: '환전', label: '환전' },
  { id: '대출카드보험', label: '대출/\n카드/보험' },
  { id: '자산뱅킹', label: '자산/뱅킹' },
];

const GRID_ITEMS = [
  { label: '관심종목' },
  { label: '현재가' },
  { label: '주문' },
  { label: '차트' },
  { label: '계좌' },
  { label: '종합뉴스' },
  { label: '투자정보' },
  { label: '주식분석' },
  { label: 'KITCH', isKitch: true },
  { label: '투자자별' },
  { label: '빅데이터' },
  { label: '기업정보' },
  { label: '조건검색' },
  { label: '미수반대' },
  { label: '커뮤니티' },
  { label: '자동일지' },
  { label: 'ETF분석' },
  { label: '캐치(모의)' },
  { label: '캐치(실전)' },
  { label: '소수점' },
  { label: '투자분석' },
  { label: '주식대여' },
  { label: '공모주' },
];

const BOTTOM_TABS = [
  { icon: 'home',      label: 'HOME' },
  { icon: 'user',      label: 'MY' },
  { icon: 'bell',      label: '알림센터' },
  { icon: 'shield',    label: '인증/보안' },
  { icon: 'headphones', label: '고객센터' },
  { icon: 'log-out',   label: '로그아웃' },
];

export default function KiwoomMenu() {
  const insets = useSafeAreaInsets();
  const [activeLeft, setActiveLeft] = useState('국내주식');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* ── 상단 헤더 ── */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        {/* 챗봇 아이콘 */}
        <TouchableOpacity style={styles.chatBtn}>
          <View style={styles.chatBubble}>
            <Text style={styles.chatBubbleText}>Chat</Text>
          </View>
          <View style={styles.chatRobot}>
            <Text style={{ fontSize: 14 }}>🤖</Text>
          </View>
        </TouchableOpacity>

        {/* 검색바 */}
        <View style={styles.searchBar}>
          <Text style={styles.searchText}>메뉴·종목 검색 가능</Text>
          <View style={styles.micBtn}>
            <Feather name="mic" size={14} color="#FFFFFF" />
          </View>
        </View>

        {/* 헤더 아이콘들 */}
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.headerIconItem}>
            <Feather name="bell" size={16} color="#1A1A2E" />
            <Text style={styles.headerIconLabel}>공지/게시판</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconItem}>
            <Feather name="gift" size={16} color="#1A1A2E" />
            <Text style={styles.headerIconLabel}>이벤트</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconItem}>
            <Feather name="settings" size={16} color="#1A1A2E" />
            <Text style={styles.headerIconLabel}>설정</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 본문 (사이드바 + 콘텐츠) ── */}
      <View style={styles.body}>

        {/* 왼쪽 사이드바 */}
        <View style={styles.sidebar}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
            {LEFT_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.sidebarItem, activeLeft === cat.id && styles.sidebarItemActive]}
                onPress={() => setActiveLeft(cat.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.sidebarText, activeLeft === cat.id && styles.sidebarTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}

            {/* AI챗봇 버튼 */}
            <TouchableOpacity style={styles.aiChatBtn} activeOpacity={0.8}>
              <View style={styles.aiChatIcon}>
                <Text style={{ fontSize: 10 }}>🤖</Text>
              </View>
              <Text style={styles.aiChatLabel}>AI챗봇{'\n'}키우Me</Text>
            </TouchableOpacity>

            {/* 계좌개설 버튼 */}
            <TouchableOpacity style={styles.accountBtn} activeOpacity={0.8}>
              <Feather name="user-plus" size={12} color="#fff" />
              <Text style={styles.accountBtnText}>계좌개설</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* 오른쪽 콘텐츠 */}
        <View style={styles.content}>
          {/* 간편모드 배너 */}
          <View style={styles.modeBanner}>
            <Text style={styles.modeBannerText}>쉬운 투자, 쉬운 경험 </Text>
            <Text style={styles.modeBannerAccent}>간편모드</Text>
            <Text style={styles.modeBannerText}>를 이용해보세요!</Text>
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={styles.modeToggle}>
              <Text style={styles.modeToggleText}>일반</Text>
            </TouchableOpacity>
            <Text style={styles.modeTogglePlain}>간편</Text>
          </View>

          {/* 카테고리 제목 */}
          <View style={styles.categoryHeader}>
            <Text style={styles.categoryTitle}>국내주식</Text>
            <View style={styles.divider} />
          </View>

          {/* 드롭다운 */}
          <TouchableOpacity style={styles.dropdown}>
            <Text style={styles.dropdownText}>주식/ETF/ETN</Text>
            <Feather name="chevron-down" size={14} color="#64647A" />
          </TouchableOpacity>

          {/* 그리드 메뉴 */}
          <ScrollView showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}>
            <View style={styles.grid}>
              {GRID_ITEMS.map((item, idx) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.gridItem,
                    idx % 2 === 0 ? styles.gridItemLeft : styles.gridItemRight,
                    item.isKitch && styles.gridItemKitch,
                  ]}
                  onPress={() => item.isKitch && router.push('/')}
                  activeOpacity={item.isKitch ? 0.7 : 0.85}
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

      {/* ── 하단 탭바 (메뉴 전용: X + 아이콘) ── */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom }]}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Feather name="x" size={20} color="#1A1A2E" />
        </TouchableOpacity>
        {BOTTOM_TABS.map(tab => (
          <TouchableOpacity key={tab.label} style={styles.tabBarItem}>
            <Feather name={tab.icon as any} size={16} color="#64647A" />
            <Text style={styles.tabBarText}>{tab.label}</Text>
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
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 10, paddingBottom: 10,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E8E8F0',
  },
  chatBtn: { flexDirection: 'row', alignItems: 'flex-end', marginRight: 2 },
  chatBubble: {
    backgroundColor: '#5B35B5', borderRadius: 8,
    paddingHorizontal: 5, paddingVertical: 2, marginRight: -6, marginBottom: 14, zIndex: 1,
  },
  chatBubbleText: { fontSize: 8, color: '#fff', fontWeight: '700' },
  chatRobot: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#EDE8FF', alignItems: 'center', justifyContent: 'center',
  },

  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F5F5FA', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  searchText: { flex: 1, fontSize: 12, color: '#9898A8' },
  micBtn: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#5B35B5', alignItems: 'center', justifyContent: 'center',
  },

  headerIcons: { flexDirection: 'row', gap: 10 },
  headerIconItem: { alignItems: 'center', gap: 2 },
  headerIconLabel: { fontSize: 8, color: '#64647A' },

  /* 본문 */
  body: { flex: 1, flexDirection: 'row' },

  /* 사이드바 */
  sidebar: { width: 80, backgroundColor: '#12146A' },
  sidebarItem: { paddingVertical: 13, paddingHorizontal: 6, alignItems: 'center' },
  sidebarItemActive: { backgroundColor: '#FFFFFF' },
  sidebarText: {
    fontSize: 11, color: 'rgba(255,255,255,0.75)',
    textAlign: 'center', lineHeight: 15,
  },
  sidebarTextActive: { color: '#12146A', fontWeight: '700' },

  aiChatBtn: {
    margin: 8, backgroundColor: '#1E2080', borderRadius: 8,
    paddingVertical: 8, alignItems: 'center', gap: 4,
  },
  aiChatIcon: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#5B35B5', alignItems: 'center', justifyContent: 'center',
  },
  aiChatLabel: { fontSize: 9, color: '#fff', textAlign: 'center', lineHeight: 13 },

  accountBtn: {
    margin: 8, backgroundColor: '#5B35B5', borderRadius: 8,
    paddingVertical: 8, alignItems: 'center', flexDirection: 'row',
    justifyContent: 'center', gap: 4,
  },
  accountBtnText: { fontSize: 10, color: '#fff', fontWeight: '700' },

  /* 콘텐츠 영역 */
  content: { flex: 1, backgroundColor: '#FFFFFF' },

  modeBanner: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
    paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: '#F8F6FF',
    borderBottomWidth: 1, borderBottomColor: '#E8E8F0', gap: 2,
  },
  modeBannerText: { fontSize: 11, color: '#64647A' },
  modeBannerAccent: { fontSize: 11, color: '#5B35B5', fontWeight: '700' },
  modeToggle: {
    backgroundColor: '#5B35B5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  modeToggleText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  modeTogglePlain: { fontSize: 11, color: '#64647A' },

  categoryHeader: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4 },
  categoryTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  divider: { height: 1, backgroundColor: '#E8E8F0' },

  dropdown: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#D0D0E0', borderRadius: 4,
    marginHorizontal: 12, marginBottom: 6,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  dropdownText: { fontSize: 13, color: '#1A1A2E' },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridItem: {
    width: '50%', paddingVertical: 13, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F8',
    backgroundColor: '#FFFFFF', position: 'relative',
  },
  gridItemLeft: { borderRightWidth: 1, borderRightColor: '#F0F0F8' },
  gridItemRight: {},
  gridItemKitch: {
    backgroundColor: '#F0EBFF',
  },
  gridItemText: { fontSize: 13, color: '#1A1A2E', fontWeight: '400' },
  gridItemTextKitch: { color: '#5B35B5', fontWeight: '700', fontSize: 14 },
  kitchSub: { fontSize: 10, color: '#7B5BD4', marginTop: 2 },
  kitchBadge: {
    position: 'absolute', top: 6, right: 8,
    backgroundColor: '#E22C29', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4,
  },
  kitchBadgeText: { fontSize: 9, color: '#fff', fontWeight: '700' },

  /* 하단 탭바 */
  tabBar: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: '#E8E8F0', paddingTop: 6,
  },
  closeBtn: {
    width: 44, alignItems: 'center', justifyContent: 'center',
    borderRightWidth: 1, borderRightColor: '#E8E8F0',
  },
  tabBarItem: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 2 },
  tabBarText: { fontSize: 8, color: '#64647A' },
});
