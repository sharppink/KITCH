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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useAnalysisHistory } from '@/hooks/useAnalysisHistory';
import { useFolders } from '@/hooks/useFolders';
import { HistoryCard } from '@/components/HistoryCard';
import { HistoryItem } from '@/hooks/useAnalysisHistory';

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
    (r.title ?? '').toLowerCase().includes(lower) ||
    (r.summary ?? '').toLowerCase().includes(lower) ||
    (r.keyPoints ?? []).some((p) => p.toLowerCase().includes(lower)) ||
    (r.sectorTags ?? []).some((t) => t.toLowerCase().includes(lower)) ||
    (r.recommendedStocks ?? []).some(
      (s) => s.name.toLowerCase().includes(lower) || s.ticker.toLowerCase().includes(lower)
    ) ||
    (item.inputUrl ?? '').toLowerCase().includes(lower)
  );
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const { history, deleteFromHistory, updateFolder } = useAnalysisHistory();
  const { folders, addFolder, deleteFolder } = useFolders();

  const [searchQuery, setSearchQuery]   = useState('');
  const [dateFilter, setDateFilter]     = useState<DateFilterKey>('all');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);

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

  const handleQuickAnalyze = (type: string) =>
    router.push({ pathname: '/input', params: { type } });

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    searchInputRef.current?.blur();
  }, []);

  /* 필터 적용 항목 */
  const filteredItems = useMemo(() =>
    history.filter((item) =>
      (!activeFolder || item.folderId === activeFolder) &&
      matchesDateFilter(item, dateFilter) &&
      matchesKeyword(item, searchQuery.trim())
    ),
    [history, activeFolder, dateFilter, searchQuery]
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
                <Feather name="bookmark" size={28} color={Colors.primary} />
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
        <TouchableOpacity style={styles.bellBtn}>
          <Feather name="bell" size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </View>

      {/* ── 콘텐츠 ── */}
      <View style={{ flex: 1 }}>
        {history.length === 0 ? (
          <ScrollView showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.emptyScroll, { paddingBottom: 100 }]}>
            <View style={styles.heroBanner}>
              <View style={[styles.heroIcon, { backgroundColor: '#EEF0FF' }]}>
                <Feather name="bookmark" size={22} color={Colors.primary} />
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

              {/* 우: 달력 아이콘 — 탭하면 날짜 필터 토글 */}
              <TouchableOpacity
                style={[styles.calendarBtn, showDatePicker && styles.calendarBtnActive]}
                onPress={() => { Haptics.selectionAsync(); setShowDatePicker(v => !v); }}
                activeOpacity={0.75}
              >
                <Feather name="calendar" size={16}
                  color={dateFilter !== 'all' ? Colors.primary : showDatePicker ? Colors.primary : Colors.textSecondary} />
                {dateFilter !== 'all' && <View style={styles.calendarActiveDot} />}
              </TouchableOpacity>
            </View>

            {/* 날짜 필터 드롭다운 — 달력 아이콘 탭 시 */}
            {showDatePicker && (
              <View style={styles.datePicker}>
                {DATE_FILTERS.map(({ key, label }) => {
                  const active = dateFilter === key;
                  const cnt = key !== 'all' ? history.filter((i) => matchesDateFilter(i, key)).length : history.length;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.datePickerItem,
                        active && styles.datePickerItemActive,
                        key === 'month' && { borderBottomWidth: 0 },
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setDateFilter(key);
                        setShowDatePicker(false);
                      }}
                      activeOpacity={0.75}
                    >
                      {active
                        ? <Feather name="check-circle" size={14} color={Colors.primary} />
                        : <Feather name="circle"       size={14} color={Colors.border} />}
                      <Text style={[styles.datePickerLabel, active && styles.datePickerLabelActive]}>{label}</Text>
                      <Text style={styles.datePickerCount}>{cnt}건</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* 폴더 탭 */}
            {folders.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.folderTabsRow} style={styles.folderTabsScroll}>
                <TouchableOpacity
                  style={[styles.folderTab, activeFolder === null && styles.folderTabActive]}
                  onPress={() => setActiveFolder(null)} activeOpacity={0.75}>
                  <Text style={[styles.folderTabText, activeFolder === null && styles.folderTabTextActive]}>전체 폴더</Text>
                </TouchableOpacity>
                {folders.map((folder) => {
                  const count    = history.filter((h) => h.folderId === folder.id).length;
                  const isActive = activeFolder === folder.id;
                  return (
                    <TouchableOpacity key={folder.id}
                      style={[styles.folderTab, isActive && styles.folderTabActive]}
                      onPress={() => setActiveFolder(isActive ? null : folder.id)} activeOpacity={0.75}>
                      <Text style={styles.folderTabEmoji}>{folder.emoji}</Text>
                      <Text style={[styles.folderTabText, isActive && styles.folderTabTextActive]}>{folder.name}</Text>
                      {count > 0 && (
                        <View style={[styles.folderTabBadge, isActive && styles.folderTabBadgeActive]}>
                          <Text style={[styles.folderTabBadgeText, isActive && styles.folderTabBadgeTextActive]}>{count}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
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
          onPress={() => router.push('/analyze-sheet')}>
          <Feather name="plus" size={17} color="#fff" />
          <Text style={styles.fabText}>콘텐츠 저장하기</Text>
        </TouchableOpacity>
      </View>

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
                  const count = history.filter((h) => h.folderId === folder.id).length;
                  return (
                    <View key={folder.id} style={styles.folderMgrRow}>
                      <Text style={styles.folderMgrEmoji}>{folder.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.folderMgrName}>{folder.name}</Text>
                        <Text style={styles.folderMgrCount}>{count}개 기록</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); deleteFolder(folder.id); }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Feather name="trash-2" size={16} color={Colors.textTertiary} />
                      </TouchableOpacity>
                    </View>
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
                <Text style={styles.folderOptionEmoji}>{folder.emoji}</Text>
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

  /* 날짜 필터 드롭다운 */
  datePicker: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 14, marginBottom: 10, overflow: 'hidden',
  },
  datePickerItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  datePickerItemActive: { backgroundColor: Colors.primaryBg },
  datePickerLabel: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 14, color: Colors.text },
  datePickerLabelActive: { fontFamily: 'Inter_700Bold', color: Colors.primary },
  datePickerCount: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textTertiary },

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
  folderMgrRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
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
