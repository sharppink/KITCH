// 결과 화면 - AI 분석 결과 표시
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { KiwoomBottomBar } from '@/components/KiwoomBottomBar';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { Card } from '@/components/Card';
import { RadarChart } from '@/components/RadarChart';
import { ProgressBar } from '@/components/ProgressBar';
import { SentimentBadge } from '@/components/SentimentBadge';
import { StockPriceSheet } from '@/components/StockPriceSheet';
import { StockPriceRow } from '@/components/StockPriceRow';
import { useAnalysisHistory } from '@/hooks/useAnalysisHistory';
import { AnalysisResult, StockRecommendation } from '@/services/aiAnalysis';
import { fetchSectorNews, formatNewsAge, NewsItem } from '@/services/sectorNews';
import {
  getCredibilityColor,
  getCredibilityLabel,
  getSentimentLabel,
  formatDate,
  getContentTypeLabel,
} from '@/utils/formatters';

const openUrl = (url?: string) => {
  if (!url) return;
  Linking.openURL(url).catch(() => {});
};

export default function ResultScreen() {
  const insets = useSafeAreaInsets();
  const { historyId } = useLocalSearchParams<{ historyId: string }>();
  const { history, updateMemo } = useAnalysisHistory();

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [inputUrl, setInputUrl] = useState<string | undefined>(undefined);
  const [memo, setMemo] = useState('');
  const [relatedNews, setRelatedNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockRecommendation | null>(null);
  const [showStockSheet, setShowStockSheet] = useState(false);
  const [showCredInfo, setShowCredInfo] = useState(false);
  const [showSentimentInfo, setShowSentimentInfo] = useState(false);
  const [showStocksInfo, setShowStocksInfo] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [memoEditText, setMemoEditText] = useState('');
  const [showRadarChart, setShowRadarChart] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (historyId && history.length > 0) {
      const item = history.find((h) => h.id === historyId);
      if (item) {
        setResult(item.result);
        setInputUrl(item.inputUrl);
        setMemo(item.memo ?? '');
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start();
        // 섹터 뉴스 자동 fetch
        if (item.result.sectorKeywords && !item.result.cannotAnalyze) {
          setNewsLoading(true);
          fetchSectorNews(item.result.sectorKeywords)
            .then(setRelatedNews)
            .finally(() => setNewsLoading(false));
        }
      }
    }
  }, [historyId, history]);

  const handleSaveMemo = async () => {
    if (!historyId) return;
    await updateMemo(historyId, memoEditText.trim());
    setMemo(memoEditText.trim());
    setShowMemoModal(false);
  };

  const openMemoModal = () => {
    setMemoEditText(memo);
    setShowMemoModal(true);
  };

  const handleShare = async () => {
    if (!result) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `📊 InvestLens 분석 결과 - ${result.sourceTitle}\n\n신뢰도: ${result.credibilityScore}/100\n투자 심리: ${getSentimentLabel(result.sentiment)}\n\n• ${(result.summary ?? []).join('\n• ')}\n\n관련 종목: ${(result.recommendedStocks ?? []).map((s) => s.ticker).join(', ')}\n\n⚠️ 본 내용은 투자 권유가 아닙니다.`,
      });
    } catch (e) {
      console.error(e);
    }
  };

  if (!result) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <Feather name="loader" size={32} color={Colors.textTertiary} />
        <Text style={styles.loadingText}>분석 결과 불러오는 중...</Text>
      </View>
    );
  }

  const cannotAnalyze = result.cannotAnalyze === true;
  const geoBlocked = result.geoBlocked === true;
  const credColor = getCredibilityColor(result.credibilityScore);
  const criteriaScores: number[] = Array.isArray(result.criteriaScores) && result.criteriaScores.length === 6
    ? result.criteriaScores
    : [];
  const belowThresholdCount = criteriaScores.filter((s) => s < 40).length;
  const isUnreliable = criteriaScores.length === 6 && belowThresholdCount >= 4;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#12146A" />

      {/* 헤더 — 키움 스타일 진한 남색 */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.replace('/')} style={styles.backButton} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>분석 결과</Text>
        <TouchableOpacity onPress={handleShare} style={styles.shareButton} activeOpacity={0.7}>
          <Feather name="share" size={18} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* 출처 카드 */}
          <Card style={styles.sourceCard}>
            <View style={styles.sourceRow}>
              <View style={styles.sourceIconBg}>
                <Feather
                  name={result.contentType === 'news' ? 'link' : result.contentType === 'youtube' ? 'youtube' : result.contentType === 'twitter' ? 'twitter' : 'image'}
                  size={15}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.sourceInfo}>
                <Text style={styles.sourceTitle} numberOfLines={2}>{result.sourceTitle}</Text>
                {inputUrl && <Text style={styles.sourceUrl} numberOfLines={1}>{inputUrl}</Text>}
              </View>
            </View>
            <View style={styles.sourceFooter}>
              <Text style={styles.analyzedAt}>
                {getContentTypeLabel(result.contentType)} · {formatDate(new Date(result.analyzedAt))} 분석 완료
              </Text>
            </View>

            {/* 섹터 태그 — 소스 카드 하단 */}
            {(result.sectorTags?.length ?? 0) > 0 && (
              <View style={styles.sectorTagsRow}>
                {(result.sectorTags ?? []).map((tag) => (
                  <View key={tag} style={styles.sectorTag}>
                    <Text style={styles.sectorTagText}># {tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* 원본 보기 버튼 — URL 있을 때만 표시 */}
            {inputUrl && result.contentType !== 'screenshot' as any && (
              <TouchableOpacity
                style={styles.originalLinkBtn}
                onPress={() => openUrl(inputUrl)}
                activeOpacity={0.75}
              >
                <Feather
                  name={result.contentType === 'youtube' ? 'youtube' : result.contentType === 'twitter' ? 'twitter' : 'external-link'}
                  size={14}
                  color={Colors.primary}
                />
                <Text style={styles.originalLinkText}>
                  {result.contentType === 'youtube' ? '유튜브에서 원본 영상 보기' : result.contentType === 'twitter' ? '트위터(X)에서 원본 보기' : '원본 기사 보기'}
                </Text>
                <Feather name="chevron-right" size={13} color={Colors.primary} />
              </TouchableOpacity>
            )}

          </Card>

          {/* 신뢰도 점수 */}
          <Card style={styles.credibilityCard} elevated>
            {cannotAnalyze ? (
              <View style={styles.cannotAnalyzeBox}>
                <Feather name={geoBlocked ? "globe" : "alert-circle"} size={28} color="#888" style={{ marginBottom: 8 }} />
                <Text style={styles.cannotAnalyzeTitle}>{geoBlocked ? "지역 제한 영상" : "분석 불가"}</Text>
                <Text style={styles.cannotAnalyzeDesc}>
                  {geoBlocked
                    ? "해당 영상은 한국에서만 시청 가능하여\n서버에서 내용을 가져올 수 없습니다."
                    : "자막·설명을 가져올 수 없어\n신뢰도를 산출하지 못했습니다."}
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.credHeader}>
                  <View style={styles.credTitleRow}>
                    <Text style={styles.cardTitle}>신뢰도 점수</Text>
                    {result.isInvestmentContent !== false && (
                      <TouchableOpacity
                        style={styles.infoBtn}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowCredInfo(true); }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.infoBtnText}>i</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {result.isInvestmentContent === false ? (
                    <Text style={styles.credScoreNA}>판단 불가</Text>
                  ) : isUnreliable ? (
                    <Text style={styles.credScoreWarning}>⚠️ 신뢰성 주의</Text>
                  ) : (
                    <Text style={[styles.credScore, { color: credColor }]}>
                      {result.credibilityScore}
                      <Text style={styles.credScoreMax}>/100</Text>
                    </Text>
                  )}
                </View>
                {result.isInvestmentContent === false ? (
                  <View style={styles.credNABox}>
                    <Feather name="slash" size={14} color={Colors.textTertiary} />
                    <Text style={styles.credNAText}>투자 정보가 없는 콘텐츠는{'\n'}신뢰도를 산출하지 않습니다.</Text>
                  </View>
                ) : (
                  <>
                    <ProgressBar value={result.credibilityScore} height={10} />
                    <View style={styles.credFooter}>
                      <Text style={[styles.credLabel, { color: isUnreliable ? '#E22C29' : credColor }]}>
                        {isUnreliable ? '신뢰 불가' : getCredibilityLabel(result.credibilityScore)}
                      </Text>
                    </View>
                    {criteriaScores.length === 6 && (
                      <>
                        <TouchableOpacity
                          style={styles.radarToggleBtn}
                          onPress={() => { Haptics.selectionAsync(); setShowRadarChart(v => !v); }}
                          activeOpacity={0.75}
                        >
                          <Feather name={showRadarChart ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.primary} />
                        </TouchableOpacity>
                        {showRadarChart && <RadarChart scores={criteriaScores} />}
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </Card>

          {/* 신뢰도 설명 모달 */}
          <Modal
            visible={showCredInfo}
            transparent
            animationType="fade"
            onRequestClose={() => setShowCredInfo(false)}
          >
            <Pressable style={styles.modalOverlay} onPress={() => setShowCredInfo(false)}>
              <Pressable style={styles.modalBox} onPress={e => e.stopPropagation()}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleRow}>
                    <View style={styles.infoBtnLarge}>
                      <Text style={styles.infoBtnLargeText}>i</Text>
                    </View>
                    <Text style={styles.modalTitle}>신뢰도 점수 산출 방식</Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowCredInfo(false)}>
                    <Feather name="x" size={18} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalDivider} />

                <View style={styles.formulaSection}>
                  <Text style={styles.formulaTitle}>📐 체크리스트 감점 + ROC 가중치법</Text>
                  <View style={styles.formulaBox}>
                    <Text style={styles.formulaText}>
                      각 기준을 100점에서 시작해 결함 항목을 차감(-10~-30){'\n'}→ 6개 기준 점수 × ROC 가중치 합산 = 최종 신뢰도
                    </Text>
                  </View>
                </View>

                <View style={styles.criteriaList}>
                  {[
                    { icon: '🏛️', label: '출처 권위도 (40.8%)', desc: '실명·법인 확인 불가, 전문성 없음, 신규 계정, 허위정보 이력, 개인 의견 중심 여부를 체크합니다.' },
                    { icon: '⏱️', label: '시점 유효성 (24.2%)', desc: '이미 반영된 정보, 이벤트 종료, 오래된 정보, 과거 재가공, 작성 시점 불명확 여부를 체크합니다.' },
                    { icon: '🧠', label: '논리적 완결성 (15.8%)', desc: '인과관계 부족, 단정적 표현, 사후 해석, 리스크 미언급, 단일 근거 일반화 여부를 체크합니다.' },
                    { icon: '🔍', label: '이해관계 투명성 (10.3%)', desc: '외부 유입 유도, 이해관계 미공개, 조건형 콘텐츠, 일방적 홍보, 낚시성 콘텐츠 여부를 체크합니다.' },
                    { icon: '📊', label: '데이터 구체성 (6.1%)', desc: '핵심 수치 없음, 시각 자료 없음, 비교 대상 없음, 출처 없음, 분석 없음 여부를 체크합니다.' },
                    { icon: '🔄', label: '교차검증 일치도 (2.8%)', desc: '외부 데이터 불일치, 출처 간 충돌, 논리 충돌, 시점 불일치, 비정상 구조 여부를 체크합니다.' },
                  ].map(item => (
                    <View key={item.label} style={styles.criteriaItem}>
                      <Text style={styles.criteriaIcon}>{item.icon}</Text>
                      <View style={styles.criteriaText}>
                        <Text style={styles.criteriaLabel}>{item.label}</Text>
                        <Text style={styles.criteriaDesc}>{item.desc}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={styles.modalNote}>
                  <Feather name="alert-circle" size={13} color={Colors.textTertiary} />
                  <Text style={styles.modalNoteText}>
                    해당 지표는 참고용이며 투자 판단의 근거로 단독 활용하지 않도록 권고합니다.
                  </Text>
                </View>

                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowCredInfo(false)}>
                  <Text style={styles.modalCloseBtnText}>확인</Text>
                </TouchableOpacity>
              </Pressable>
            </Pressable>
          </Modal>

          {/* 투자 심리 기준 모달 */}
          <Modal
            visible={showSentimentInfo}
            transparent
            animationType="fade"
            onRequestClose={() => setShowSentimentInfo(false)}
          >
            <Pressable style={styles.modalOverlay} onPress={() => setShowSentimentInfo(false)}>
              <Pressable style={styles.modalBox} onPress={e => e.stopPropagation()}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleRow}>
                    <View style={styles.infoBtnLarge}>
                      <Text style={styles.infoBtnLargeText}>i</Text>
                    </View>
                    <Text style={styles.modalTitle}>투자 심리 판단 기준</Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowSentimentInfo(false)}>
                    <Feather name="x" size={18} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalDivider} />

                <View style={styles.criteriaList}>
                  {[
                    { icon: '📈', label: '강세 (Positive)', desc: '실적 개선, 수주·계약 체결, 목표주가 상향, 업황 회복, 정책 수혜, 신사업 모멘텀 등 투자에 긍정적인 신호.' },
                    { icon: '➖', label: '중립 (Neutral)', desc: '단순 사실 전달, 긍정·부정 신호가 혼재되거나 방향성이 불명확한 경우, 현상 유지 의견.' },
                    { icon: '📉', label: '약세 (Negative)', desc: '실적 부진·적자 전환, 목표주가 하향, 규제 리스크, 경쟁 심화, 대규모 손실·소송 등 투자에 부정적인 신호.' },
                  ].map(item => (
                    <View key={item.label} style={styles.criteriaItem}>
                      <Text style={styles.criteriaIcon}>{item.icon}</Text>
                      <View style={styles.criteriaText}>
                        <Text style={styles.criteriaLabel}>{item.label}</Text>
                        <Text style={styles.criteriaDesc}>{item.desc}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={styles.modalNote}>
                  <Feather name="alert-circle" size={13} color={Colors.textTertiary} />
                  <Text style={styles.modalNoteText}>
                    투자 심리는 콘텐츠 내용을 AI가 종합 판단한 결과이며, 실제 시장 상황과 다를 수 있습니다. 투자 판단의 보조 참고 자료로만 활용하시기 바랍니다.
                  </Text>
                </View>

                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowSentimentInfo(false)}>
                  <Text style={styles.modalCloseBtnText}>확인</Text>
                </TouchableOpacity>
              </Pressable>
            </Pressable>
          </Modal>

          {/* 상세 요약 모달 */}
          <Modal
            visible={showDetailModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowDetailModal(false)}
          >
            <Pressable style={styles.modalOverlay} onPress={() => setShowDetailModal(false)}>
              <Pressable style={styles.detailModalSheet} onPress={() => {}}>
                <View style={styles.detailModalHandle} />
                <View style={styles.detailModalHeader}>
                  <View style={styles.cardTitleRow}>
                    <LinearGradient colors={['#2D3A9E', '#4B5FD6']} style={styles.cardTitleIcon}>
                      <Feather name="cpu" size={13} color="#fff" />
                    </LinearGradient>
                    <Text style={styles.cardTitle}>상세 분석</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowDetailModal(false)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Feather name="x" size={20} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.detailModalScroll} showsVerticalScrollIndicator={false}>
                  <Text style={styles.detailModalText}>
                    {result?.detailedSummary || '상세 분석 내용이 없습니다.'}
                  </Text>
                </ScrollView>
              </Pressable>
            </Pressable>
          </Modal>

          {/* AI 요약 */}
          <Card style={styles.summaryCard}>
            <View style={[styles.cardTitleRow, { justifyContent: 'space-between' }]}>
              <View style={styles.cardTitleRow}>
                <LinearGradient colors={['#2D3A9E', '#4B5FD6']} style={styles.cardTitleIcon}>
                  <Feather name="cpu" size={13} color="#fff" />
                </LinearGradient>
                <Text style={styles.cardTitle}>AI 핵심 요약</Text>
              </View>
              {!cannotAnalyze && result?.detailedSummary ? (
                <TouchableOpacity
                  style={styles.detailBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowDetailModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Feather name="align-left" size={12} color={Colors.primary} />
                  <Text style={styles.detailBtnText}>상세보기</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {cannotAnalyze ? (
              <Text style={styles.cannotAnalyzeDesc}>
                {geoBlocked
                  ? "한국 전용 영상으로 분류되어 서버에서 내용에 접근할 수 없습니다. 앱에서 직접 분석하거나 다른 영상을 시도해 주세요."
                  : "영상 내용을 불러올 수 없어 요약을 제공할 수 없습니다. 자막이 비활성화된 영상이거나 접근이 제한된 영상일 수 있습니다."}
              </Text>
            ) : (result.summary ?? []).map((bullet, i) => (
              <View key={i} style={styles.bulletRow}>
                <View style={styles.bulletDot}>
                  <Text style={styles.bulletNumber}>{i + 1}</Text>
                </View>
                <Text style={styles.bulletText}>{bullet}</Text>
              </View>
            ))}
          </Card>

          {/* 투자 심리 */}
          {!cannotAnalyze && (
          <Card style={styles.metricCard}>
            <View style={styles.metricTitleRow}>
              <Text style={styles.metricLabel}>투자 심리</Text>
              <TouchableOpacity
                onPress={() => setShowSentimentInfo(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.infoBtn}
              >
                <Text style={styles.infoBtnText}>i</Text>
              </TouchableOpacity>
            </View>
            <SentimentBadge sentiment={result.sentiment} />
            <Text style={styles.metricDescription}>
              {result.sentiment === 'positive' ? '강세 신호가 포착됩니다' : result.sentiment === 'negative' ? '약세 신호가 포착됩니다' : '혼재된 신호가 나타납니다'}
            </Text>
          </Card>
          )}

          {/* 관련 종목 — 인라인 시세 */}
          {!cannotAnalyze && (
          <Card style={styles.stocksCard}>
            <View style={[styles.cardTitleRow, { justifyContent: 'space-between' }]}>
              <View style={styles.cardTitleRow}>
                <LinearGradient colors={['#16A34A', '#22C55E']} style={styles.cardTitleIcon}>
                  <Feather name="trending-up" size={13} color="#fff" />
                </LinearGradient>
                <Text style={styles.cardTitle}>관련 종목</Text>
                <TouchableOpacity
                  style={styles.infoBtn}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowStocksInfo(true); }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.infoBtnText}>i</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.stocksSubHint}>탭하면 상세 시세·주문</Text>
            </View>
            <View style={styles.stocksInlineList}>
              {(result.recommendedStocks ?? []).map((stock) => (
                <StockPriceRow
                  key={stock.ticker}
                  stock={stock}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedStock(stock);
                    setShowStockSheet(true);
                  }}
                />
              ))}
            </View>
          </Card>
          )}

          {/* 관련 종목 선정 기준 모달 */}
          <Modal visible={showStocksInfo} transparent animationType="fade"
            onRequestClose={() => setShowStocksInfo(false)}>
            <Pressable style={styles.modalOverlay} onPress={() => setShowStocksInfo(false)}>
              <Pressable style={styles.modalBox} onPress={e => e.stopPropagation()}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleRow}>
                    <LinearGradient colors={['#16A34A', '#22C55E']} style={styles.infoBtnLarge}>
                      <Text style={styles.infoBtnLargeText}>i</Text>
                    </LinearGradient>
                    <Text style={styles.modalTitle}>관련 종목 선정 기준</Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowStocksInfo(false)}>
                    <Feather name="x" size={18} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalDivider} />

                <View style={styles.formulaSection}>
                  <Text style={styles.formulaTitle}>📋 선정 우선순위</Text>
                  {[
                    { rank: '1순위', desc: '콘텐츠 본문·자막에 실명 언급된 종목' },
                    { rank: '2순위', desc: '해당 산업·테마의 시가총액 상위 대표주' },
                    { rank: '3순위', desc: '관련 공급망·경쟁사·수혜 섹터 종목' },
                  ].map(({ rank, desc }) => (
                    <View key={rank} style={styles.criterionRow}>
                      <View style={styles.criterionBadge}>
                        <Text style={styles.criterionBadgeText}>{rank}</Text>
                      </View>
                      <Text style={styles.criterionDesc}>{desc}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.formulaSection}>
                  <Text style={styles.formulaTitle}>🎯 관련도 판단 기준</Text>
                  {[
                    { label: '관련도 높음', color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', desc: '콘텐츠에 직접 언급되거나 핵심 테마의 시총 1~2위 종목' },
                    { label: '관련도 보통', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', desc: '동일 공급망·경쟁사·직접 수혜 관계 종목' },
                    { label: '관련도 낮음', color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB', desc: '섹터 유사성 또는 매크로 환경 연관성만 있는 종목' },
                  ].map(({ label, color, bg, border, desc }) => (
                    <View key={label} style={[styles.relevanceCriterionRow, { backgroundColor: bg, borderColor: border }]}>
                      <Text style={[styles.relevanceCriterionLabel, { color }]}>{label}</Text>
                      <Text style={styles.relevanceCriterionDesc}>{desc}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowStocksInfo(false)}>
                  <Text style={styles.modalCloseBtnText}>확인</Text>
                </TouchableOpacity>
              </Pressable>
            </Pressable>
          </Modal>

          {/* 추천 뉴스 */}
          {!cannotAnalyze && (result.sectorTags?.length ?? 0) > 0 && (
          <Card style={styles.contextCard}>
            <View style={styles.cardTitleRow}>
              <LinearGradient colors={['#1D4ED8', '#2563EB']} style={styles.cardTitleIcon}>
                <Feather name="rss" size={13} color="#fff" />
              </LinearGradient>
              <Text style={styles.cardTitle}>추천 뉴스</Text>
            </View>

            {/* 관련 추천 뉴스 */}
            {newsLoading ? (
              <View style={styles.newsLoadingRow}>
                <Feather name="loader" size={14} color={Colors.textTertiary} />
                <Text style={styles.newsLoadingText}>관련 뉴스 불러오는 중...</Text>
              </View>
            ) : relatedNews.length > 0 ? (
              <View style={styles.newsList}>
                {relatedNews.slice(0, 4).map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.newsItem, idx === Math.min(relatedNews.length, 4) - 1 && styles.newsItemLast]}
                    activeOpacity={0.75}
                    onPress={() => openUrl(item.url)}
                  >
                    <View style={styles.newsItemLeft}>
                      <Text style={styles.newsTitle} numberOfLines={2}>{item.title}</Text>
                      <View style={styles.newsMetaRow}>
                        {item.source ? (
                          <Text style={styles.newsSource}>{item.source}</Text>
                        ) : null}
                        <Text style={styles.newsAge}>{formatNewsAge(item.publishedAt)}</Text>
                      </View>
                    </View>
                    <Feather name="external-link" size={13} color={Colors.textTertiary} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.newsEmpty}>관련 뉴스를 찾지 못했습니다</Text>
            )}
          </Card>
          )}

          {/* 메모 */}
          <TouchableOpacity onPress={openMemoModal} activeOpacity={0.85} style={styles.memoCard}>
            <LinearGradient colors={['#3B2D8E', Colors.primary]} style={styles.memoHeader}>
              <View style={styles.memoHeaderLeft}>
                <Feather name="edit-3" size={14} color="#fff" />
                <Text style={styles.memoHeaderTitle}>메모</Text>
              </View>
              <Text style={styles.memoHeaderHint}>{memo ? '수정하기' : '탭하여 작성'}</Text>
            </LinearGradient>
            <View style={styles.memoBody}>
              {memo ? (
                <Text style={styles.memoText}>{memo}</Text>
              ) : (
                <Text style={styles.memoPlaceholder}>이 콘텐츠에 대한 생각을 기록해두세요</Text>
              )}
              {[0,1,2,3].map((i) => <View key={i} style={styles.memoLine} />)}
            </View>
          </TouchableOpacity>

          {/* 메모 편집 모달 */}
          <Modal
            visible={showMemoModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowMemoModal(false)}
          >
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              <Pressable style={styles.modalOverlay} onPress={() => setShowMemoModal(false)}>
                <Pressable style={styles.memoSheet} onPress={() => {}}>
                  <View style={styles.detailModalHandle} />
                  <LinearGradient colors={['#3B2D8E', Colors.primary]} style={styles.memoSheetHeader}>
                    <View style={styles.memoHeaderLeft}>
                      <Feather name="edit-3" size={16} color="#fff" />
                      <Text style={styles.memoSheetTitle}>메모</Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowMemoModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Feather name="x" size={20} color="rgba(255,255,255,0.7)" />
                    </TouchableOpacity>
                  </LinearGradient>
                  <TextInput
                    style={styles.memoInput}
                    value={memoEditText}
                    onChangeText={setMemoEditText}
                    placeholder="이 콘텐츠에 대한 생각, 투자 아이디어, 체크 포인트를 자유롭게 적어보세요"
                    placeholderTextColor={Colors.textTertiary}
                    multiline
                    autoFocus
                    textAlignVertical="top"
                  />
                  <View style={styles.memoSheetFooter}>
                    <TouchableOpacity style={styles.memoCancelBtn} onPress={() => setShowMemoModal(false)} activeOpacity={0.7}>
                      <Text style={styles.memoCancelText}>취소</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.memoSaveBtn} onPress={handleSaveMemo} activeOpacity={0.85}>
                      <Feather name="check" size={16} color="#fff" />
                      <Text style={styles.memoSaveText}>저장</Text>
                    </TouchableOpacity>
                  </View>
                </Pressable>
              </Pressable>
            </KeyboardAvoidingView>
          </Modal>

          {/* 투자 주의 문구 */}
          <View style={styles.disclaimerBox}>
            <Feather name="alert-triangle" size={13} color={Colors.warning} />
            <Text style={styles.disclaimerText}>
              본 분석은 참고용 정보이며, 투자 판단의 최종 책임은 사용자에게 있습니다.
            </Text>
          </View>

          {/* 추가 분석 버튼 */}
          <TouchableOpacity style={styles.analyzeAnotherButton} onPress={() => router.push('/analyze-sheet')} activeOpacity={0.8}>
            <Feather name="plus-circle" size={16} color={Colors.primary} />
            <Text style={styles.analyzeAnotherText}>다른 콘텐츠 분석하기</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
      <StockPriceSheet
        stock={selectedStock}
        visible={showStockSheet}
        onClose={() => setShowStockSheet(false)}
      />
      <KiwoomBottomBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.textSecondary },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#12146A' },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#FFFFFF' },
  shareButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 16, gap: 12 },
  sourceCard: { gap: 12, marginBottom: 4 },
  sourceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  sourceIconBg: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(75, 95, 214, 0.15)', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  sourceInfo: { flex: 1, gap: 2 },
  sourceTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.text, lineHeight: 22 },
  sourceUrl: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textTertiary },
  sourceFooter: { gap: 8 },
  originalLinkBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  originalLinkText: {
    flex: 1, fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.primary,
  },
  analyzedAt: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textTertiary },
  sourceBadges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  credibilityCard: { gap: 12, marginBottom: 4 },
  cannotAnalyzeBox: { alignItems: 'center', paddingVertical: 16 },
  cannotAnalyzeTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#555', marginBottom: 6 },
  cannotAnalyzeDesc: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  credHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  credTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoBtn: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  infoBtnText: { fontSize: 10, color: '#fff', fontWeight: '800', fontStyle: 'italic' },
  cardTitle: { fontFamily: 'Inter_700Bold', fontSize: 15, color: Colors.text },
  credScore: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -1 },
  credScoreMax: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.textTertiary },
  credScoreWarning: { fontFamily: 'Inter_700Bold', fontSize: 20, color: '#E22C29', letterSpacing: -0.5 },
  radarToggleBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 4, marginTop: 2 },
  radarToggleText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.primary, flex: 1, textAlign: 'center' },
  credScoreNA: { fontFamily: 'Inter_700Bold', fontSize: 18, color: Colors.textTertiary, letterSpacing: -0.3 },
  credNABox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.bg, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, marginTop: 2 },
  credNAText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textTertiary, lineHeight: 18 },
  credFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  credLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  credHint: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textTertiary, flex: 1, textAlign: 'right' },
  summaryCard: { gap: 14, marginBottom: 4 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitleIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bulletDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(75, 95, 214, 0.15)', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  bulletNumber: { fontFamily: 'Inter_700Bold', fontSize: 11, color: Colors.primary },
  bulletText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.text, lineHeight: 21 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  metricCard: { gap: 8, marginBottom: 0 },
  halfCard: { flex: 1 },
  metricTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metricLabel: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.textSecondary, marginBottom: 2 },
  metricDescription: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textTertiary, lineHeight: 16, marginTop: 4 },
  stocksCard: { gap: 12, marginBottom: 4 },
  stocksSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: -4 },
  stocksList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  relevanceLegend: { flexDirection: 'row', gap: 14, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textTertiary },
  disclaimerBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: 'rgba(245, 158, 11, 0.08)', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.2)', borderRadius: 12, padding: 12, marginBottom: 4 },
  disclaimerText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary, flex: 1, lineHeight: 18 },
  analyzeAnotherButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1, borderColor: Colors.primary, paddingVertical: 14, marginBottom: 4 },
  analyzeAnotherText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.primary },

  /* 신뢰도 설명 모달 */
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20,
  },
  modalBox: {
    width: '100%', backgroundColor: Colors.surface,
    borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 24, elevation: 12,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoBtnLarge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  infoBtnLargeText: { fontSize: 13, color: '#fff', fontWeight: '800', fontStyle: 'italic' },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, color: Colors.text },
  modalDivider: { height: 1, backgroundColor: Colors.border, marginBottom: 16 },
  formulaSection: { marginBottom: 16 },
  formulaTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.text, marginBottom: 8 },
  formulaBox: {
    backgroundColor: Colors.primaryBg, borderRadius: 10,
    padding: 12, borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  formulaText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.primary, lineHeight: 18 },
  criteriaList: { gap: 12, marginBottom: 16 },
  criteriaItem: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  criteriaIcon: { fontSize: 16, marginTop: 1 },
  criteriaText: { flex: 1, gap: 2 },
  criteriaLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.text },
  criteriaDesc: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },

  /* 관련 종목 모달 */
  criterionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  criterionBadge: {
    backgroundColor: Colors.primaryBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
    minWidth: 52, alignItems: 'center',
  },
  criterionBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 11, color: Colors.primary },
  criterionDesc: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.text, lineHeight: 19, paddingTop: 2 },
  relevanceCriterionRow: {
    borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 7,
  },
  relevanceCriterionLabel: { fontFamily: 'Inter_700Bold', fontSize: 12, marginBottom: 3 },
  relevanceCriterionDesc: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },

  modalNote: {
    flexDirection: 'row', gap: 6, alignItems: 'flex-start',
    backgroundColor: '#FFF9EC', borderRadius: 8, padding: 10, marginBottom: 16,
  },
  modalNoteText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textSecondary, lineHeight: 16 },
  modalCloseBtn: {
    backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 13,
    alignItems: 'center',
  },
  modalCloseBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#fff' },

  /* 상세보기 버튼 */
  detailBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  detailBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: Colors.primary },

  /* 상세 요약 바텀시트 */
  detailModalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36,
    maxHeight: '75%',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 12,
    position: 'absolute', bottom: 0, left: 0, right: 0,
  },
  detailModalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E0E0E0', alignSelf: 'center', marginBottom: 16,
  },
  detailModalHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },
  detailModalScroll: { flex: 1 },
  detailModalText: {
    fontFamily: 'Inter_400Regular', fontSize: 14,
    color: Colors.text, lineHeight: 24,
  },

  /* 메모 카드 */
  memoCard: {
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  memoHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  memoHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  memoHeaderTitle: { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#fff' },
  memoHeaderHint: { fontFamily: 'Inter_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.65)' },
  memoBody: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, gap: 0, minHeight: 110, justifyContent: 'flex-start' },
  memoText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.text, lineHeight: 22, marginBottom: 6 },
  memoPlaceholder: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textTertiary, marginBottom: 10, fontStyle: 'italic' },
  memoLine: { height: 1, backgroundColor: '#EBEBF0', marginBottom: 16 },

  /* 메모 편집 바텀시트 */
  memoSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    overflow: 'hidden',
    maxHeight: '75%',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 12,
    position: 'absolute', bottom: 0, left: 0, right: 0,
  },
  memoSheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  memoSheetTitle: { fontFamily: 'Inter_700Bold', fontSize: 17, color: '#fff' },
  memoInput: {
    fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.text,
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12,
    minHeight: 180, lineHeight: 26,
  },
  memoSheetFooter: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  memoCancelBtn: {
    flex: 1, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingVertical: 13, alignItems: 'center',
  },
  memoCancelText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.textSecondary },
  memoSaveBtn: {
    flex: 2, borderRadius: 12, backgroundColor: Colors.primary,
    paddingVertical: 13, alignItems: 'center', flexDirection: 'row',
    justifyContent: 'center', gap: 6,
  },

  /* 관련 종목 인라인 */
  stocksSubHint: {
    fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textTertiary,
  },
  stocksInlineList: { marginTop: 4 },

  /* 폴더 추가 버튼 (소스 카드 하단) */
  folderAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  folderAddText: {
    flex: 1, fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.textSecondary,
  },

  /* 추천 뉴스 카드 */
  contextCard: { gap: 10 },
  sectorTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sectorTag: {
    backgroundColor: '#1D4ED818', borderWidth: 1, borderColor: '#1D4ED830',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  sectorTagText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#1D4ED8' },

  /* 뉴스 리스트 */
  newsLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  newsLoadingText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textTertiary },
  newsList: { gap: 0, marginTop: 2 },
  newsItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  newsItemLast: { borderBottomWidth: 0 },
  newsItemLeft: { flex: 1, gap: 4 },
  newsTitle: {
    fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.text, lineHeight: 19,
  },
  newsMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  newsSource: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: Colors.primary },
  newsAge: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textTertiary },
  newsEmpty: {
    fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textTertiary,
    paddingVertical: 8, textAlign: 'center',
  },

  /* 폴더 픽커 바텀시트 */
  folderSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 32,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 12,
  },
  folderSheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 16,
  },
  folderSheetTitle: { fontFamily: 'Inter_700Bold', fontSize: 17, color: Colors.text, marginLeft: 8 },
  folderOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 13, paddingHorizontal: 8, borderRadius: 12,
  },
  folderOptionActive: { backgroundColor: Colors.primaryBg },
  folderOptionEmoji: { fontSize: 20, width: 28, textAlign: 'center' },
  folderOptionName: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 15, color: Colors.text },
  newFolderRow: {
    flexDirection: 'row', gap: 10, marginTop: 12,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  newFolderInput: {
    flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, backgroundColor: Colors.background,
  },
  newFolderBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11,
  },
  newFolderBtnText: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#fff' },
  memoSaveText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#fff' },
});
