import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { KiwoomBottomBar } from '@/components/KiwoomBottomBar';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useAnalysisHistory } from '@/hooks/useAnalysisHistory';
import { useFolders } from '@/hooks/useFolders';
import { HistoryCard } from '@/components/HistoryCard';
import { HistoryItem } from '@/hooks/useAnalysisHistory';
import { SaveContentSheet } from '@/components/SaveContentSheet';

const DATE_FILTERS = [
  { key: 'all',   label: '전체' },
  { key: 'today', label: '오늘' },
  { key: 'week',  label: '이번 주' },
  { key: 'month', label: '이번 달' },
] as const;
type DateFilterKey = (typeof DATE_FILTERS)[number]['key'];

function matchesDateFilter(item: HistoryItem, filter: DateFilterKey): boolean {
  if (filter === 'all') return true;
  const diff = Math.floor((Date.now() - new Date(item.savedAt).getTime()) / 86400000);
  if (filter === 'today') return diff === 0;
  if (filter === 'week')  return diff < 7;
  if (filter === 'month') return diff < 30;
  return true;
}

function matchesKeyword(item: HistoryItem, q: string): boolean {
  if (!q) return true;
  const lower = q.toLowerCase();
  const r = item.result;
  return (
    (r.sourceTitle ?? '').toLowerCase().includes(lower) ||
    (r.summary ?? []).some((s) => s.toLowerCase().includes(lower)) ||
    (r.sectorTags ?? []).some((t) => t.toLowerCase().includes(lower)) ||
    (r.recommendedStocks ?? []).some(
      (s) => (s.company ?? '').toLowerCase().includes(lower) || (s.ticker ?? '').toLowerCase().includes(lower)
    ) ||
    (item.inputUrl ?? '').toLowerCase().includes(lower)
  );
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const { history, deleteFromHistory, updateFolder } = useAnalysisHistory();
  const { folders, addFolder, deleteFolder } = useFolders();

  const [searchQuery, setSearchQuery]       = useState('');
  const [dateFilter, setDateFilter]         = useState<DateFilterKey>('all');
  const [rangeStart, setRangeStart]         = useState<string | null>(null); // 'YYYY-MM-DD'
  const [rangeEnd, setRangeEnd]             = useState<string | null>(null);
  const [rangeEditMode, setRangeEditMode]   = useState<'start' | 'end'>('start');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calMonth, setCalMonth]             = useState(() => new Date());
  const [activeFolder, setActiveFolder]     = useState<string | null>(null);

  /* 알림 시트 */
  const [showAlarmSheet, setShowAlarmSheet] = useState(false);
  const [alarmEnabled, setAlarmEnabled]     = useState(false);

  /* 저장 시트 */
  const [showSaveSheet, setShowSaveSheet]     = useState(false);
  const [saveSheetType, setSaveSheetType]     = useState<'news' | 'youtube' | 'twitter'>('news');

  /* 폴더 관리 시트 */
  const [showFolderManager, setShowFolderManager] = useState(false);
  const [newFolderName, setNewFolderName]         = useState('');

  /* 카드별 폴더 지정 시트 */
  const [assignTarget, setAssignTarget] = useState<HistoryItem | null>(null);

  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const fadeAnim       = useRef(new Animated.Value(0)).current;

  const showOnboarding = history.length === 0 && !onboardingDismissed;
  const isSearching    = searchQuery.trim().length > 0;

  useEffect(() => {
    if (showOnboarding) {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    }
  }, [showOnboarding]);

  const dismissOnboarding = () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() =>
      setOnboardingDismissed(true)
    );
  };

  const handleViewResult  = (item: HistoryItem) =>
    router.push({ pathname: '/result', params: { historyId: item.id, cached: 'true' } });

  const handleQuickAnalyze = (type: string) => {
    setSaveSheetType(type as 'news' | 'youtube' | 'twitter');
    setShowSaveSheet(true);
  };

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    searchInputRef.current?.blur();
  }, []);

  /* 필터 적용 항목 */
  const filteredItems = useMemo(() =>
    history.filter((item) => {
      if (activeFolder && item.folderId !== activeFolder) return false;
      if (rangeStart) {
        const d = new Date(item.savedAt);
        const itemDay = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        if (rangeEnd) {
          if (itemDay < rangeStart || itemDay > rangeEnd) return false;
        } else {
          if (itemDay !== rangeStart) return false;
        }
      } else {
        if (!matchesDateFilter(item, dateFilter)) return false;
      }
      if (!matchesKeyword(item, searchQuery.trim())) return false;
      return true;
    }),
    [history, activeFolder, dateFilter, rangeStart, rangeEnd, searchQuery]
  );

  /* 날짜 그룹 (검색 중엔 null) */
  const groupedHistory = useMemo(() => {
    if (isSearching) return null;
    const groups: Record<string, HistoryItem[]> = {};
    const now = Date.now();
    for (const item of filteredItems) {
      const diff  = Math.floor((now - new Date(item.savedAt).getTime()) / 86400000);
      const label = diff === 0 ? '오늘' : diff === 1 ? '어제' : diff < 7 ? '이번 주' : diff < 30 ? '이번 달' : '이전';
      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
    }
    const ORDER = ['오늘', '어제', '이번 주', '이번 달', '이전'];
    return ORDER.filter((g) => groups[g]).map((g) => ({ title: g, data: groups[g] }));
  }, [filteredItems, isSearching]);

  /* 폴더 지정 */
  const handleAssignFolder = async (folderId: string | undefined) => {
    if (!assignTarget) return;
    await updateFolder(assignTarget.id, folderId);
    setAssignTarget(null);
  };

  /* 폴더 관리 시트 — 새 폴더 생성 */
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await addFolder(newFolderName.trim());
    setNewFolderName('');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#12146A" />

      {/* 온보딩 모달 */}
      {showOnboarding && (
        <Animated.View style={[styles.onboardingOverlay, { opacity: fadeAnim }]}>
          <Pressable style={styles.onboardingOverlay} onPress={dismissOnboarding}>
            <Pressable style={styles.onboardingCard} onPress={() => {}}>
              <View style={styles.onboardingIconBg}>
                <Feather name="share-2" size={28} color={Colors.primary} />
              </View>
              <Text style={styles.onboardingTitle}>투자 뉴스,{'\n'}이제 빠르게 소화하세요</Text>
              <Text style={styles.onboardingBody}>
                놓치기 쉬운 투자 기사나 영상을{'\n'}링크 하나로 저장하면{'\n'}
                <Text style={styles.onboardingEmphasis}>핵심 내용</Text>만 골라서 보여드려요.{'\n\n'}
                긴 기사 처음부터 끝까지{'\n'}읽을 필요 없어요.
              </Text>
              <View style={styles.onboardingFeatures}>
                {[
                  { icon: 'link'    as const, text: '뉴스 기사 — URL 붙여넣기 또는 공유 버튼' },
                  { icon: 'youtube' as const, text: '유튜브 — URL 붙여넣기 또는 공유 버튼' },
                ].map((f) => (
                  <View key={f.text} style={styles.onboardingFeatureRow}>
                    <Feather name={f.icon} size={14} color={Colors.primary} />
                    <Text style={styles.onboardingFeatureText}>{f.text}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity style={styles.onboardingBtn} onPress={dismissOnboarding} activeOpacity={0.85}>
                <Text style={styles.onboardingBtnText}>확인</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Animated.View>
      )}

      {/* ── 헤더 ── */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        {/* 왼쪽: 폴더 관리 버튼 + KITCH 텍스트 */}
        <TouchableOpacity
          style={styles.folderMgrBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowFolderManager(true); }}
          activeOpacity={0.75}
        >
          <Feather name="folder" size={16} color="rgba(255,255,255,0.85)" />
          {folders.length > 0 && (
            <View style={styles.folderCountBadge}>
              <Text style={styles.folderCountText}>{folders.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.headerTitle}>KITCH</Text>

        {/* 오른쪽: 알림 */}
        <TouchableOpacity style={[styles.bellBtn, alarmEnabled && styles.bellBtnActive]}
          onPress={() => { Haptics.selectionAsync(); setShowAlarmSheet(true); }}
          activeOpacity={0.75}>
          <Feather name={alarmEnabled ? 'bell' : 'bell-off'} size={18}
            color={alarmEnabled ? '#FFD700' : 'rgba(255,255,255,0.5)'} />
          {alarmEnabled && <View style={styles.bellActiveDot} />}
        </TouchableOpacity>
      </View>

      {/* ── 콘텐츠 ── */}
      <View style={{ flex: 1 }}>
        {history.length === 0 ? (
          <ScrollView showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.emptyScroll, { paddingBottom: 100 }]}>
            <View style={styles.heroBanner}>
              <View style={[styles.heroIcon, { backgroundColor: '#EEF0FF' }]}>
                <Feather name="share-2" size={22} color={Colors.primary} />
              </View>
              <Text style={styles.heroTitle}>링크 하나로{'\n'}투자 뉴스 핵심만 보기</Text>
              <Text style={styles.heroSubtitle}>
                기사·유튜브 링크를 저장하면 AI가 핵심만 정리해드려요.{'\n'}브라우저 공유하기 버튼으로 바로 저장하세요.
              </Text>
            </View>
            <Text style={styles.howTitle}>이렇게 저장하세요</Text>
            <View style={styles.stepList}>
              {[
                { icon: 'link'    as const, type: 'news',    title: '뉴스 기사 링크 저장', desc: '기사 URL만 붙여넣으면 핵심 내용을 바로 정리', bg: Colors.primaryBg, color: Colors.primary },
                { icon: 'youtube' as const, type: 'youtube', title: '유튜브 영상 저장',    desc: '영상 링크를 붙여넣으면 핵심을 텍스트로 정리', bg: '#FFF0F0',        color: '#EF4444'      },
                { icon: 'twitter' as const, type: 'twitter', title: '트위터(X) 저장',      desc: '트윗 URL을 붙여넣으면 투자 내용을 바로 분석', bg: '#E8F5FE',        color: '#1D9BF0'      },
              ].map((s, i, arr) => (
                <TouchableOpacity key={s.type}
                  style={[styles.stepRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}
                  activeOpacity={0.75} onPress={() => handleQuickAnalyze(s.type)}>
                  <View style={[styles.stepIconBg, { backgroundColor: s.bg }]}>
                    <Feather name={s.icon} size={18} color={s.color} />
                  </View>
                  <View style={styles.stepText}>
                    <Text style={styles.stepTitle}>{s.title}</Text>
                    <Text style={styles.stepDesc}>{s.desc}</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={Colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.historyHint}>
              <Feather name="clock" size={13} color={Colors.textTertiary} />
              <Text style={styles.historyHintText}>저장한 콘텐츠가 이 화면에 쌓입니다</Text>
            </View>
          </ScrollView>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scroll, { paddingBottom: 80 }]}
            keyboardShouldPersistTaps="handled">

            {/* 헤더 행 */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>내 분석 기록</Text>
              <View style={styles.badge}><Text style={styles.badgeText}>{history.length}</Text></View>
            </View>

            {/* ── 검색창 (이미지와 동일한 단일 바) ── */}
            <View style={styles.searchBarWrap}>
              {/* 좌: 돋보기 + 입력 */}
              <View style={styles.searchBarInner}>
                <Feather name="search" size={15} color={Colors.textTertiary} />
                <TextInput
                  ref={searchInputRef}
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="키워드로 검색..."
                  placeholderTextColor={Colors.textTertiary}
                  returnKeyType="search"
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={clearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <View style={styles.clearBtn}>
                      <Feather name="x" size={11} color="#fff" />
                    </View>
                  </TouchableOpacity>
                )}
              </View>

              {/* 구분선 */}
              <View style={styles.searchDivider} />

              {/* 우: 달력 아이콘 */}
              <TouchableOpacity
                style={[styles.calendarBtn, (showDatePicker || rangeStart || dateFilter !== 'all') && styles.calendarBtnActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setRangeEditMode(rangeStart && !rangeEnd ? 'end' : 'start');
                  setShowDatePicker(v => !v);
                }}
                activeOpacity={0.75}
              >
                <Feather name="calendar" size={16}
                  color={(rangeStart || dateFilter !== 'all' || showDatePicker) ? Colors.primary : Colors.textSecondary} />
                {(rangeStart || dateFilter !== 'all') && <View style={styles.calendarActiveDot} />}
              </TouchableOpacity>
            </View>

            {/* 활성 폴더 필터 표시 */}
            {activeFolder && (() => {
              const af = folders.find((f) => f.id === activeFolder);
              return af ? (
                <View style={styles.activeFolderBar}>
                  <Text style={styles.activeFolderBarEmoji}>📁</Text>
                  <Text style={styles.activeFolderBarName}>{af.name}</Text>
                  <TouchableOpacity onPress={() => setActiveFolder(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Feather name="x" size={14} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              ) : null;
            })()}

            {/* 활성 날짜 기간 표시 */}
            {rangeStart && (
              <View style={styles.activeFolderBar}>
                <Feather name="calendar" size={13} color={Colors.primary} />
                <Text style={styles.activeFolderBarName}>
                  {rangeEnd ? `${rangeStart} ~ ${rangeEnd}` : rangeStart}
                </Text>
                <TouchableOpacity onPress={() => { setRangeStart(null); setRangeEnd(null); }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="x" size={14} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            )}

            {/* 검색 결과 */}
            {isSearching ? (
              <>
                <View style={styles.searchResultHeader}>
                  <Feather name="search" size={13} color={Colors.textTertiary} />
                  <Text style={styles.searchResultText}>
                    <Text style={styles.searchResultKeyword}>"{searchQuery}"</Text>
                    {' '}검색 결과 {filteredItems.length}건
                  </Text>
                </View>
                {filteredItems.length === 0 ? (
                  <View style={styles.emptyResult}>
                    <Feather name="inbox" size={32} color={Colors.border} />
                    <Text style={styles.emptyResultTitle}>검색 결과가 없습니다</Text>
                    <Text style={styles.emptyResultDesc}>다른 키워드나 날짜 범위로 다시 검색해 보세요</Text>
                  </View>
                ) : filteredItems.map((item) => (
                  <HistoryCard key={item.id} item={item}
                    onPress={() => handleViewResult(item)}
                    onDelete={() => deleteFromHistory(item.id)}
                    onFolderPress={() => setAssignTarget(item)}
                    currentFolderName={folders.find(f => f.id === item.folderId)?.name}
                    highlightKeyword={searchQuery.trim()}
                  />
                ))}
              </>
            ) : (
              <>
                {filteredItems.length === 0 ? (
                  <View style={styles.emptyResult}>
                    <Feather name="inbox" size={32} color={Colors.border} />
                    <Text style={styles.emptyResultTitle}>해당 기간 기록이 없습니다</Text>
                    <Text style={styles.emptyResultDesc}>다른 날짜 범위를 선택해 보세요</Text>
                  </View>
                ) : (groupedHistory ?? []).map((section) => (
                  <View key={section.title}>
                    <View style={styles.dateSectionRow}>
                      <Text style={styles.dateSectionLabel}>{section.title}</Text>
                      <View style={styles.dateSectionLine} />
                      <Text style={styles.dateSectionCount}>{section.data.length}건</Text>
                    </View>
                    {section.data.map((item) => (
                      <HistoryCard key={item.id} item={item}
                        onPress={() => handleViewResult(item)}
                        onDelete={() => deleteFromHistory(item.id)}
                        onFolderPress={() => setAssignTarget(item)}
                        currentFolderName={folders.find(f => f.id === item.folderId)?.name}
                      />
                    ))}
                  </View>
                ))}
              </>
            )}
          </ScrollView>
        )}
      </View>

      {/* FAB */}
      <View style={styles.fabContainer}>
        <TouchableOpacity style={styles.fab} activeOpacity={0.85}
          onPress={() => { setSaveSheetType('news'); setShowSaveSheet(true); }}>
          <Feather name="plus" size={17} color="#fff" />
          <Text style={styles.fabText}>콘텐츠 저장하기</Text>
        </TouchableOpacity>
      </View>

      {/* 저장 시트 */}
      <SaveContentSheet
        visible={showSaveSheet}
        initialType={saveSheetType}
        onClose={() => setShowSaveSheet(false)}
      />

      {/* ── 날짜 선택 캘린더 시트 ── */}
      <Modal visible={showDatePicker} transparent animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowDatePicker(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: 28 }]} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetTitleRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name="calendar" size={18} color={Colors.primary} />
                <Text style={styles.sheetTitle}>기간 선택</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Feather name="x" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* 빠른 날짜 필터 칩 */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 16, paddingHorizontal: 2 }}>
              {DATE_FILTERS.map(({ key, label }) => {
                const active = !rangeStart && dateFilter === key;
                return (
                  <TouchableOpacity key={key}
                    style={[styles.quickChip, active && styles.quickChipActive]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setDateFilter(key);
                      setRangeStart(null);
                      setRangeEnd(null);
                      setShowDatePicker(false);
                    }}
                    activeOpacity={0.75}>
                    <Text style={[styles.quickChipText, active && styles.quickChipTextActive]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 선택 상태 표시 바 */}
            <View style={styles.rangeStatusBar}>
              <TouchableOpacity activeOpacity={0.75}
                style={[styles.rangeStatusBox, rangeStart && styles.rangeStatusBoxFilled, rangeEditMode === 'start' && styles.rangeStatusBoxEditing]}
                onPress={() => { Haptics.selectionAsync(); setRangeEditMode('start'); }}>
                <Text style={[styles.rangeStatusLabel, rangeEditMode === 'start' && styles.rangeStatusLabelEditing]}>
                  {rangeEditMode === 'start' ? '▶ 시작일' : '시작일'}
                </Text>
                <Text style={[styles.rangeStatusDate, rangeStart && styles.rangeStatusDateFilled]}>
                  {rangeStart ?? '탭하여 선택'}
                </Text>
              </TouchableOpacity>
              <Feather name="arrow-right" size={14} color={Colors.textTertiary} style={{ marginTop: 18 }} />
              <TouchableOpacity activeOpacity={0.75}
                style={[styles.rangeStatusBox, rangeEnd && styles.rangeStatusBoxFilled, rangeEditMode === 'end' && styles.rangeStatusBoxEditing]}
                onPress={() => { Haptics.selectionAsync(); setRangeEditMode('end'); }}>
                <Text style={[styles.rangeStatusLabel, rangeEditMode === 'end' && styles.rangeStatusLabelEditing]}>
                  {rangeEditMode === 'end' ? '▶ 종료일' : '종료일'}
                </Text>
                <Text style={[styles.rangeStatusDate, rangeEnd && styles.rangeStatusDateFilled]}>
                  {rangeEnd ?? (rangeStart ? '탭하여 선택' : '—')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* 구분선 */}
            <View style={{ height: 1, backgroundColor: Colors.border, marginBottom: 16 }} />

            {/* 월 내비게이션 */}
            <View style={styles.calNavRow}>
              <TouchableOpacity style={styles.calNavBtn}
                onPress={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>
                <Feather name="chevron-left" size={20} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.calNavTitle}>
                {calMonth.getFullYear()}년 {calMonth.getMonth() + 1}월
              </Text>
              <TouchableOpacity style={styles.calNavBtn}
                onPress={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>
                <Feather name="chevron-right" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {/* 요일 헤더 */}
            <View style={styles.calDowRow}>
              {['일','월','화','수','목','금','토'].map((d, i) => (
                <Text key={d} style={[styles.calDow, i === 0 && { color: '#E22C29' }, i === 6 && { color: '#0052CC' }]}>{d}</Text>
              ))}
            </View>

            {/* 날짜 그리드 */}
            {(() => {
              const year  = calMonth.getFullYear();
              const month = calMonth.getMonth();
              const firstDow  = new Date(year, month, 1).getDay();
              const daysTotal = new Date(year, month + 1, 0).getDate();
              const todayStr  = (() => {
                const t = new Date();
                return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
              })();
              const datesWithHistory = new Set(
                history.map(item => {
                  const d = new Date(item.savedAt);
                  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                }).filter(ds => ds.startsWith(`${year}-${String(month+1).padStart(2,'0')}`))
              );
              const cells: (number | null)[] = [
                ...Array(firstDow).fill(null),
                ...Array.from({ length: daysTotal }, (_, i) => i + 1),
              ];
              while (cells.length % 7 !== 0) cells.push(null);
              const weeks: (number | null)[][] = [];
              for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

              return weeks.map((week, wi) => (
                <View key={wi} style={styles.calWeek}>
                  {week.map((day, di) => {
                    if (!day) return <View key={di} style={styles.calCell} />;
                    const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                    const isToday     = ds === todayStr;
                    const isStart     = ds === rangeStart;
                    const isEnd       = ds === rangeEnd;
                    const isEndpoint  = isStart || isEnd;
                    const inRange     = rangeStart && rangeEnd && ds > rangeStart && ds < rangeEnd;
                    const hasDot      = datesWithHistory.has(ds);
                    const isSun = di === 0, isSat = di === 6;

                    // 범위 배경 (셀 전체)
                    const rangeBg = inRange
                      ? (di === 0 ? styles.rangeEdgeLeft : di === 6 ? styles.rangeEdgeRight : styles.rangeMid)
                      : isStart && rangeEnd ? styles.rangeEdgeLeft
                      : isEnd ? styles.rangeEdgeRight
                      : undefined;

                    return (
                      <TouchableOpacity key={di} style={[styles.calCell, rangeBg]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setDateFilter('all');
                          if (rangeEditMode === 'start') {
                            setRangeStart(ds);
                            // 기존 종료일이 새 시작일보다 이전이면 초기화
                            if (rangeEnd && ds > rangeEnd) setRangeEnd(null);
                            setRangeEditMode('end');
                          } else {
                            // 종료일 편집 모드
                            if (rangeStart && ds < rangeStart) {
                              // 시작일보다 앞을 누르면 → 새 시작일로 설정, 종료일 유지
                              setRangeStart(ds);
                              setRangeEditMode('end');
                            } else if (ds === rangeEnd) {
                              // 같은 종료일 다시 누르면 → 종료일 초기화
                              setRangeEnd(null);
                            } else {
                              setRangeEnd(ds);
                              setShowDatePicker(false);
                            }
                          }
                        }}
                        activeOpacity={0.7}>
                        <View style={[
                          styles.calDayBg,
                          isEndpoint && styles.calDayBgSelected,
                          !isEndpoint && isToday && styles.calDayBgToday,
                        ]}>
                          <Text style={[
                            styles.calDay,
                            isEndpoint && { color: '#fff', fontFamily: 'Inter_700Bold' },
                            !isEndpoint && isToday && { color: Colors.primary, fontFamily: 'Inter_700Bold' },
                            !isEndpoint && !isToday && isSun && { color: '#E22C29' },
                            !isEndpoint && !isToday && isSat && { color: '#0052CC' },
                            !!inRange && { color: Colors.primary, fontFamily: 'Inter_600SemiBold' },
                          ]}>{day}</Text>
                        </View>
                        {hasDot && !isEndpoint && <View style={[styles.calDot, inRange ? { backgroundColor: Colors.primary } : undefined]} />}
                        {hasDot && isEndpoint && <View style={[styles.calDot, { backgroundColor: 'rgba(255,255,255,0.7)' }]} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ));
            })()}

            {/* 초기화 버튼 */}
            {(rangeStart || dateFilter !== 'all') && (
              <TouchableOpacity style={styles.clearDateBtn}
                onPress={() => { setRangeStart(null); setRangeEnd(null); setDateFilter('all'); setShowDatePicker(false); }}>
                <Feather name="x-circle" size={14} color={Colors.textTertiary} />
                <Text style={styles.clearDateText}>날짜 필터 초기화</Text>
              </TouchableOpacity>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── 알림 설정 시트 ── */}
      <Modal visible={showAlarmSheet} transparent animationType="slide"
        onRequestClose={() => setShowAlarmSheet(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowAlarmSheet(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetTitleRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name="bell" size={18} color={Colors.primary} />
                <Text style={styles.sheetTitle}>종목 변동 알림</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAlarmSheet(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Feather name="x" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* 설명 영역 */}
            <View style={styles.alarmDescBox}>
              <View style={styles.alarmDescIconRow}>
                <View style={styles.alarmDescIconBg}>
                  <Text style={{ fontSize: 26 }}>📈</Text>
                </View>
              </View>
              <Text style={styles.alarmDescTitle}>내 기사와 관련된 종목을 실시간으로 감시합니다</Text>
              <View style={styles.alarmDescItems}>
                {[
                  { icon: 'trending-up', text: '저장한 기사에서 추출된 관련 종목을 추적합니다' },
                  { icon: 'alert-circle', text: '주가 변동이 ±5% 이상일 때 즉시 알림을 보냅니다' },
                  { icon: 'star', text: '관련도 "높음"으로 분류된 종목을 우선 감시합니다' },
                ].map((item, i) => (
                  <View key={i} style={styles.alarmDescItem}>
                    <Feather name={item.icon as any} size={14} color={Colors.primary} style={{ marginTop: 1 }} />
                    <Text style={styles.alarmDescItemText}>{item.text}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* ON / OFF 토글 */}
            <View style={[styles.alarmToggleRow, alarmEnabled && styles.alarmToggleRowOn]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.alarmToggleLabel}>
                  {alarmEnabled ? '알림 켜짐 🔔' : '알림 꺼짐 🔕'}
                </Text>
                <Text style={styles.alarmToggleDesc}>
                  {alarmEnabled
                    ? '관련 종목에 큰 변동이 생기면 알려드립니다'
                    : '알림을 켜면 종목 변동을 바로 확인할 수 있습니다'}
                </Text>
              </View>
              <Switch
                value={alarmEnabled}
                onValueChange={(v) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setAlarmEnabled(v);
                }}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor="#fff"
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── 폴더 관리 시트 ── */}
      <Modal visible={showFolderManager} transparent animationType="slide"
        onRequestClose={() => setShowFolderManager(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowFolderManager(false)}>
            <Pressable style={styles.sheet} onPress={() => {}}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetTitleRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Feather name="folder" size={18} color={Colors.primary} />
                  <Text style={styles.sheetTitle}>폴더 관리</Text>
                </View>
                <TouchableOpacity onPress={() => setShowFolderManager(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Feather name="x" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* 폴더 목록 */}
              {folders.length === 0 ? (
                <View style={styles.folderEmptyBox}>
                  <Feather name="folder" size={28} color={Colors.border} />
                  <Text style={styles.folderEmptyText}>아직 만든 폴더가 없습니다</Text>
                </View>
              ) : (
                folders.map((folder) => {
                  const count    = history.filter((h) => h.folderId === folder.id).length;
                  const isActive = activeFolder === folder.id;
                  return (
                    <TouchableOpacity key={folder.id} style={[styles.folderMgrRow, isActive && styles.folderMgrRowActive]}
                      activeOpacity={0.7}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setActiveFolder(isActive ? null : folder.id);
                        setShowFolderManager(false);
                      }}>
                      <Text style={styles.folderMgrEmoji}>📁</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.folderMgrName, isActive && { color: Colors.primary }]}>{folder.name}</Text>
                        <Text style={styles.folderMgrCount}>{count}개 기록</Text>
                      </View>
                      {isActive && <Feather name="check" size={16} color={Colors.primary} style={{ marginRight: 8 }} />}
                      <TouchableOpacity
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); deleteFolder(folder.id); }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Feather name="trash-2" size={16} color={Colors.textTertiary} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })
              )}

              {/* 새 폴더 */}
              <View style={styles.newFolderRow}>
                <TextInput
                  style={styles.newFolderInput}
                  value={newFolderName}
                  onChangeText={setNewFolderName}
                  placeholder="새 폴더 이름..."
                  placeholderTextColor={Colors.textTertiary}
                  maxLength={20}
                  returnKeyType="done"
                  onSubmitEditing={handleCreateFolder}
                />
                <TouchableOpacity
                  style={[styles.newFolderBtn, !newFolderName.trim() && { opacity: 0.4 }]}
                  disabled={!newFolderName.trim()}
                  activeOpacity={0.8}
                  onPress={handleCreateFolder}>
                  <Feather name="plus" size={16} color="#fff" />
                  <Text style={styles.newFolderBtnText}>만들기</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── 폴더 지정 시트 (카드별) ── */}
      <Modal visible={!!assignTarget} transparent animationType="slide"
        onRequestClose={() => setAssignTarget(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setAssignTarget(null)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetTitleRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name="folder-plus" size={18} color={Colors.primary} />
                <Text style={styles.sheetTitle}>폴더에 추가</Text>
              </View>
              <TouchableOpacity onPress={() => setAssignTarget(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Feather name="x" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {assignTarget && (
              <Text style={styles.assignItemTitle} numberOfLines={1}>
                {assignTarget.result.sourceTitle}
              </Text>
            )}

            {/* 분류 없음 */}
            <TouchableOpacity
              style={[styles.folderOption, !assignTarget?.folderId && styles.folderOptionActive]}
              onPress={() => handleAssignFolder(undefined)} activeOpacity={0.75}>
              <Text style={styles.folderOptionEmoji}>📋</Text>
              <Text style={styles.folderOptionName}>분류 없음</Text>
              {!assignTarget?.folderId && <Feather name="check" size={16} color={Colors.primary} />}
            </TouchableOpacity>

            {folders.map((folder) => (
              <TouchableOpacity key={folder.id}
                style={[styles.folderOption, assignTarget?.folderId === folder.id && styles.folderOptionActive]}
                onPress={() => handleAssignFolder(folder.id)} activeOpacity={0.75}>
                <Text style={styles.folderOptionEmoji}>📁</Text>
                <Text style={styles.folderOptionName}>{folder.name}</Text>
                {assignTarget?.folderId === folder.id && <Feather name="check" size={16} color={Colors.primary} />}
              </TouchableOpacity>
            ))}

            {folders.length === 0 && (
              <View style={styles.folderEmptyBox}>
                <Text style={styles.folderEmptyText}>폴더를 먼저 만들어 주세요</Text>
                <TouchableOpacity style={styles.goFolderMgrBtn}
                  onPress={() => { setAssignTarget(null); setTimeout(() => setShowFolderManager(true), 300); }}>
                  <Feather name="folder-plus" size={14} color={Colors.primary} />
                  <Text style={styles.goFolderMgrText}>폴더 만들러 가기</Text>
                </TouchableOpacity>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <KiwoomBottomBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  /* 온보딩 */
  onboardingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center', zIndex: 100, paddingHorizontal: 24,
  },
  onboardingCard: {
    width: '100%', backgroundColor: Colors.surface, borderRadius: 24, padding: 28,
    alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 32, elevation: 16,
  },
  onboardingIconBg: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: Colors.primaryBg,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  onboardingTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, color: Colors.text, textAlign: 'center' },
  onboardingBody: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  onboardingEmphasis: { fontFamily: 'Inter_700Bold', color: Colors.primary },
  onboardingFeatures: { alignSelf: 'stretch', backgroundColor: Colors.primaryBg, borderRadius: 14, padding: 16, gap: 10, marginVertical: 4 },
  onboardingFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  onboardingFeatureText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.text },
  onboardingBtn: { alignSelf: 'stretch', backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  onboardingBtnText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#fff' },

  /* 헤더 */
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: '#12146A', gap: 10,
  },
  folderMgrBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  folderCountBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: Colors.primary, borderRadius: 7,
    minWidth: 14, height: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  folderCountText: { fontFamily: 'Inter_700Bold', fontSize: 9, color: '#fff' },
  headerTitle: { flex: 1, fontFamily: 'Inter_700Bold', fontSize: 20, color: '#fff', letterSpacing: 1.5 },
  bellBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  bellBtnActive: {
    backgroundColor: 'rgba(255,215,0,0.18)',
    borderColor: 'rgba(255,215,0,0.5)',
  },
  bellActiveDot: {
    position: 'absolute', top: 6, right: 6,
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#FFD700',
    borderWidth: 1.5, borderColor: '#12146A',
  },

  /* 알림 설정 시트 */
  alarmDescBox: {
    backgroundColor: Colors.background, borderRadius: 14,
    padding: 16, marginBottom: 16, gap: 10,
  },
  alarmDescIconRow: { alignItems: 'center', marginBottom: 4 },
  alarmDescIconBg: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  alarmDescTitle: {
    fontFamily: 'Inter_600SemiBold', fontSize: 14,
    color: Colors.text, textAlign: 'center', lineHeight: 20,
  },
  alarmDescItems: { gap: 10, marginTop: 4 },
  alarmDescItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  alarmDescItemText: {
    flex: 1, fontFamily: 'Inter_400Regular',
    fontSize: 13, color: Colors.textSecondary, lineHeight: 18,
  },
  alarmToggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: Colors.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  alarmToggleRowOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  alarmToggleLabel: {
    fontFamily: 'Inter_700Bold', fontSize: 15, color: Colors.text,
  },
  alarmToggleDesc: {
    fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary,
  },

  emptyScroll: { paddingHorizontal: 20, paddingTop: 20 },
  heroBanner: { backgroundColor: Colors.surface, borderRadius: 20, padding: 24, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: Colors.border, marginBottom: 24 },
  heroIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroTitle: { fontFamily: 'Inter_700Bold', fontSize: 17, color: Colors.text, textAlign: 'center', lineHeight: 24 },
  heroSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 21 },
  howTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.textSecondary, marginBottom: 10, letterSpacing: 0.3 },
  stepList: { backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', marginBottom: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  stepIconBg: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepText: { flex: 1, gap: 2 },
  stepTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.text },
  stepDesc: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  historyHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 },
  historyHintText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textTertiary },

  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, color: Colors.text },
  badge: { backgroundColor: Colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#fff' },

  /* 검색창 — 단일 바 */
  searchBarWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 14, marginBottom: 10, overflow: 'hidden',
  },
  searchBarInner: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 13,
  },
  searchInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.text, paddingVertical: 0 },
  clearBtn: { width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.textTertiary, alignItems: 'center', justifyContent: 'center' },
  searchDivider: { width: 1, height: 24, backgroundColor: Colors.border },
  calendarBtn: { paddingHorizontal: 14, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  calendarBtnActive: { backgroundColor: Colors.primaryBg },
  calendarActiveDot: {
    position: 'absolute', top: 10, right: 10,
    width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary,
  },

  /* 달력 — 빠른 선택 칩 */
  quickChip: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7, backgroundColor: Colors.surface,
  },
  quickChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  quickChipText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.textSecondary },
  quickChipTextActive: { color: '#fff', fontFamily: 'Inter_600SemiBold' },

  /* 달력 — 월 내비 */
  calNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  calNavBtn: { padding: 8 },
  calNavTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, color: Colors.text },

  /* 달력 — 요일 헤더 */
  calDowRow: { flexDirection: 'row', marginBottom: 4 },
  calDow: { flex: 1, textAlign: 'center', fontFamily: 'Inter_600SemiBold', fontSize: 12, color: Colors.textSecondary, paddingVertical: 6 },

  /* 달력 — 날짜 그리드 */
  calWeek: { flexDirection: 'row' },
  calCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  calDayBg: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  calDayBgSelected: { backgroundColor: Colors.primary },
  calDayBgToday: { backgroundColor: Colors.primaryBg },
  calDay: { fontFamily: 'Inter_500Medium', fontSize: 14, color: Colors.text },
  calDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.primary, marginTop: 2 },

  /* 날짜 초기화 */
  clearDateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginTop: 14, padding: 8 },
  clearDateText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textTertiary },

  /* 날짜 범위 상태 바 */
  rangeStatusBar: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 16 },
  rangeStatusBox: { flex: 1, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 10 },
  rangeStatusBoxFilled: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  rangeStatusBoxEditing: { borderColor: Colors.primary, borderWidth: 2, shadowColor: Colors.primary, shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  rangeStatusLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textTertiary, marginBottom: 4 },
  rangeStatusLabelEditing: { color: Colors.primary, fontFamily: 'Inter_600SemiBold' },
  rangeStatusDate: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.textSecondary },
  rangeStatusDateFilled: { color: Colors.primary },

  /* 범위 하이라이트 */
  rangeMid: { backgroundColor: 'rgba(91,53,181,0.08)' },
  rangeEdgeLeft: { backgroundColor: 'rgba(91,53,181,0.08)', borderTopLeftRadius: 20, borderBottomLeftRadius: 20 },
  rangeEdgeRight: { backgroundColor: 'rgba(91,53,181,0.08)', borderTopRightRadius: 20, borderBottomRightRadius: 20 },

  /* 폴더 탭 */
  folderTabsScroll: { marginBottom: 10, marginHorizontal: -16 },
  folderTabsRow: { paddingHorizontal: 16, gap: 8, paddingVertical: 4 },
  folderTab: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  folderTabActive: { backgroundColor: Colors.primaryBg, borderColor: Colors.primary },
  folderTabEmoji: { fontSize: 14 },
  folderTabText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.textSecondary },
  folderTabTextActive: { color: Colors.primary, fontFamily: 'Inter_600SemiBold' },
  folderTabBadge: { backgroundColor: Colors.border, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  folderTabBadgeActive: { backgroundColor: '#D6C8F5' },
  folderTabBadgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: Colors.textSecondary },
  folderTabBadgeTextActive: { color: Colors.primary },

  /* 날짜 섹션 */
  dateSectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 8, paddingHorizontal: 2 },
  dateSectionLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: Colors.primary, minWidth: 36 },
  dateSectionLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dateSectionCount: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textTertiary },

  /* 검색 결과 */
  searchResultHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 2 },
  searchResultText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary },
  searchResultKeyword: { fontFamily: 'Inter_700Bold', color: Colors.primary },

  /* 빈 결과 */
  emptyResult: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyResultTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.textSecondary },
  emptyResultDesc: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textTertiary, textAlign: 'center' },

  /* 모달 공통 */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 36,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 12,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginTop: 12, marginBottom: 20 },
  sheetTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle: { fontFamily: 'Inter_700Bold', fontSize: 17, color: Colors.text },

  /* 폴더 관리 */
  folderMgrRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, borderRadius: 8 },
  folderMgrRowActive: { backgroundColor: Colors.primaryBg },
  activeFolderBar: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primaryBg, borderWidth: 1, borderColor: Colors.primary, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start', marginBottom: 10 },
  activeFolderBarEmoji: { fontSize: 13 },
  activeFolderBarName: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.primary },
  folderMgrEmoji: { fontSize: 22, width: 32, textAlign: 'center' },
  folderMgrName: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.text },
  folderMgrCount: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textTertiary },
  folderEmptyBox: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  folderEmptyText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.textTertiary },
  goFolderMgrBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  goFolderMgrText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.primary },
  newFolderRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  newFolderInput: {
    flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, backgroundColor: Colors.background,
  },
  newFolderBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11 },
  newFolderBtnText: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#fff' },

  /* 폴더 지정 옵션 */
  folderOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 8, borderRadius: 12 },
  folderOptionActive: { backgroundColor: Colors.primaryBg },
  folderOptionEmoji: { fontSize: 20, width: 28, textAlign: 'center' },
  folderOptionName: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 15, color: Colors.text },
  assignItemTitle: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary, marginBottom: 12, paddingHorizontal: 4 },

  /* FAB */
  fabContainer: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
  fab: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  fabText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#fff' },
});
