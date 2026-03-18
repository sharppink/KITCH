// 결과 화면 - AI 분석 결과 표시
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { KiwoomBottomBar } from '@/components/KiwoomBottomBar';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { SentimentBadge } from '@/components/SentimentBadge';
import { StockTag } from '@/components/StockTag';
import { useAnalysisHistory } from '@/hooks/useAnalysisHistory';
import { AnalysisResult } from '@/services/aiAnalysis';
import {
  getCredibilityColor,
  getCredibilityLabel,
  getSentimentLabel,
  formatDate,
  getContentTypeLabel,
} from '@/utils/formatters';

export default function ResultScreen() {
  const insets = useSafeAreaInsets();
  const { historyId } = useLocalSearchParams<{ historyId: string }>();
  const { history } = useAnalysisHistory();

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [inputUrl, setInputUrl] = useState<string | undefined>(undefined);
  const [showCredInfo, setShowCredInfo] = useState(false);
  const [showSentimentInfo, setShowSentimentInfo] = useState(false);

  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (historyId && history.length > 0) {
      const item = history.find((h) => h.id === historyId);
      if (item) {
        setResult(item.result);
        setInputUrl(item.inputUrl);
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start();
      }
    }
  }, [historyId, history]);

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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#12146A" />

      {/* 헤더 — 키움 스타일 진한 남색 */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.push('/kitch-home')} style={styles.backButton} activeOpacity={0.7}>
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
                  name={result.contentType === 'news' ? 'link' : result.contentType === 'youtube' ? 'youtube' : 'image'}
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
              <View style={styles.sourceBadges}>
                <SentimentBadge sentiment={result.sentiment} />
              </View>
            </View>

            {/* 원본 보기 버튼 — URL 있을 때만 표시 */}
            {inputUrl && result.contentType !== 'screenshot' && (
              <TouchableOpacity
                style={styles.originalLinkBtn}
                onPress={() => Linking.openURL(inputUrl)}
                activeOpacity={0.75}
              >
                <Feather
                  name={result.contentType === 'youtube' ? 'youtube' : 'external-link'}
                  size={14}
                  color={Colors.primary}
                />
                <Text style={styles.originalLinkText}>
                  {result.contentType === 'youtube' ? '유튜브에서 원본 영상 보기' : '원본 기사 보기'}
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
                    <TouchableOpacity
                      style={styles.infoBtn}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowCredInfo(true); }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.infoBtnText}>i</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.credScore, { color: credColor }]}>
                    {result.credibilityScore}
                    <Text style={styles.credScoreMax}>/100</Text>
                  </Text>
                </View>
                <ProgressBar value={result.credibilityScore} height={10} />
                <View style={styles.credFooter}>
                  <Text style={[styles.credLabel, { color: credColor }]}>
                    {getCredibilityLabel(result.credibilityScore)}
                  </Text>
                  <Text style={styles.credHint}>출처 품질 및 내용 분석 기반</Text>
                </View>
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
                  <Text style={styles.formulaTitle}>📐 ROC 가중치법</Text>
                  <View style={styles.formulaBox}>
                    <Text style={styles.formulaText}>
                      신뢰도 = 각 기준별 점수 × ROC 가중치의 합산{'\n'}(기준별 점수: 부정 지표 해당 시 차감, 최솟값 5점)
                    </Text>
                  </View>
                </View>

                <View style={styles.criteriaList}>
                  {[
                    { icon: '🏛️', label: '출처 권위도 (40.8%)', desc: '말하는 사람이 믿을 만한 전문가인가요? 실명·자격·제도권 소속 여부를 봅니다.' },
                    { icon: '⏱️', label: '시점 유효성 (24.2%)', desc: '지금 바로 써먹을 수 있는 최신 정보인가요? 정보의 신선도와 시세 선반영 여부를 봅니다.' },
                    { icon: '🧠', label: '논리적 완결성 (15.8%)', desc: '앞뒤 맥락이 맞고 과장이 없나요? 논리 비약·단정적 선동·리스크 외면 여부를 봅니다.' },
                    { icon: '🔍', label: '이해관계 투명성 (10.3%)', desc: '광고나 홍보 목적을 숨기고 있지 않나요? 리딩방 유도·협찬 미표기 등을 봅니다.' },
                    { icon: '📊', label: '데이터 구체성 (6.1%)', desc: '추측이 아닌 실제 숫자나 도표가 있나요? 수치·차트·출처 명기 여부를 봅니다.' },
                    { icon: '🔄', label: '교차 검증 일치도 (2.7%)', desc: '다른 믿을 만한 곳도 같은 말을 하나요? 외부 팩트와의 정합성을 봅니다.' },
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

          {/* AI 요약 */}
          <Card style={styles.summaryCard}>
            <View style={styles.cardTitleRow}>
              <LinearGradient colors={['#2D3A9E', '#4B5FD6']} style={styles.cardTitleIcon}>
                <Feather name="cpu" size={13} color="#fff" />
              </LinearGradient>
              <Text style={styles.cardTitle}>AI 핵심 요약</Text>
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

          {/* 관련 종목 */}
          {!cannotAnalyze && (
          <Card style={styles.stocksCard}>
            <View style={styles.cardTitleRow}>
              <LinearGradient colors={['#16A34A', '#22C55E']} style={styles.cardTitleIcon}>
                <Feather name="trending-up" size={13} color="#fff" />
              </LinearGradient>
              <Text style={styles.cardTitle}>관련 종목</Text>
            </View>
            <Text style={styles.stocksSubtitle}>해당 콘텐츠에서 언급되거나 연관된 종목입니다</Text>
            <View style={styles.stocksList}>
              {(result.recommendedStocks ?? []).map((stock) => (
                <StockTag key={stock.ticker} stock={stock} />
              ))}
            </View>
            <View style={styles.relevanceLegend}>
              {[
                { r: 'high' as const, label: '높은 연관성' },
                { r: 'medium' as const, label: '보통 연관성' },
                { r: 'low' as const, label: '낮은 연관성' },
              ].map(({ r, label }) => (
                <View key={r} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: r === 'high' ? Colors.accent : r === 'medium' ? Colors.warning : Colors.neutral }]} />
                  <Text style={styles.legendText}>{label}</Text>
                </View>
              ))}
            </View>
          </Card>
          )}

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
});
