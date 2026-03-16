// 결과 화면 - AI 분석 결과 표시
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Animated,
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
import { SentimentBadge, RiskBadge } from '@/components/SentimentBadge';
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
        message: `📊 InvestLens 분석 결과 - ${result.sourceTitle}\n\n신뢰도: ${result.credibilityScore}/100\n투자 심리: ${getSentimentLabel(result.sentiment)}\n\n• ${result.summary.join('\n• ')}\n\n관련 종목: ${result.recommendedStocks.map((s) => s.ticker).join(', ')}\n\n⚠️ 본 내용은 투자 권유가 아닙니다.`,
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

  const credColor = getCredibilityColor(result.credibilityScore);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* 헤더 */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.push('/kitch-home')} style={styles.backButton} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>분석 결과</Text>
        <TouchableOpacity onPress={handleShare} style={styles.shareButton} activeOpacity={0.7}>
          <Feather name="share" size={18} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
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
                <RiskBadge riskLevel={result.riskLevel} />
              </View>
            </View>
          </Card>

          {/* 신뢰도 점수 */}
          <Card style={styles.credibilityCard} elevated>
            <View style={styles.credHeader}>
              <Text style={styles.cardTitle}>신뢰도 점수</Text>
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
          </Card>

          {/* AI 요약 */}
          <Card style={styles.summaryCard}>
            <View style={styles.cardTitleRow}>
              <LinearGradient colors={['#2D3A9E', '#4B5FD6']} style={styles.cardTitleIcon}>
                <Feather name="cpu" size={13} color="#fff" />
              </LinearGradient>
              <Text style={styles.cardTitle}>AI 핵심 요약</Text>
            </View>
            {result.summary.map((bullet, i) => (
              <View key={i} style={styles.bulletRow}>
                <View style={styles.bulletDot}>
                  <Text style={styles.bulletNumber}>{i + 1}</Text>
                </View>
                <Text style={styles.bulletText}>{bullet}</Text>
              </View>
            ))}
          </Card>

          {/* 심리 & 리스크 */}
          <View style={styles.row}>
            <Card style={[styles.metricCard, styles.halfCard]}>
              <Text style={styles.metricLabel}>투자 심리</Text>
              <SentimentBadge sentiment={result.sentiment} />
              <Text style={styles.metricDescription}>
                {result.sentiment === 'positive' ? '강세 신호가 포착됩니다' : result.sentiment === 'negative' ? '약세 신호가 포착됩니다' : '혼재된 신호가 나타납니다'}
              </Text>
            </Card>
            <Card style={[styles.metricCard, styles.halfCard]}>
              <Text style={styles.metricLabel}>리스크 수준</Text>
              <RiskBadge riskLevel={result.riskLevel} />
              <Text style={styles.metricDescription}>
                {result.riskLevel === 'low' ? '보수적, 변동성 낮음' : result.riskLevel === 'medium' ? '중간 수준의 리스크' : '고변동성, 주의 필요'}
              </Text>
            </Card>
          </View>

          {/* 관련 종목 */}
          <Card style={styles.stocksCard}>
            <View style={styles.cardTitleRow}>
              <LinearGradient colors={['#16A34A', '#22C55E']} style={styles.cardTitleIcon}>
                <Feather name="trending-up" size={13} color="#fff" />
              </LinearGradient>
              <Text style={styles.cardTitle}>관련 종목</Text>
            </View>
            <Text style={styles.stocksSubtitle}>해당 콘텐츠에서 언급되거나 연관된 종목입니다</Text>
            <View style={styles.stocksList}>
              {result.recommendedStocks.map((stock) => (
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

          {/* 투자 주의 문구 */}
          <View style={styles.disclaimerBox}>
            <Feather name="alert-triangle" size={13} color={Colors.warning} />
            <Text style={styles.disclaimerText}>
              본 분석은 AI가 생성한 교육 목적의 정보입니다. 투자 권유가 아니며, 실제 투자 결정 전에는 반드시 자체적인 조사와 전문가 상담을 진행하시기 바랍니다.
            </Text>
          </View>

          {/* 추가 분석 버튼 */}
          <TouchableOpacity style={styles.analyzeAnotherButton} onPress={() => router.push('/analyze-sheet')} activeOpacity={0.8}>
            <Feather name="plus-circle" size={16} color={Colors.primary} />
            <Text style={styles.analyzeAnotherText}>다른 콘텐츠 분석하기</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.textSecondary },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: Colors.text },
  shareButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 16, gap: 12 },
  sourceCard: { gap: 12, marginBottom: 4 },
  sourceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  sourceIconBg: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(75, 95, 214, 0.15)', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  sourceInfo: { flex: 1, gap: 2 },
  sourceTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.text, lineHeight: 22 },
  sourceUrl: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textTertiary },
  sourceFooter: { gap: 8 },
  analyzedAt: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textTertiary },
  sourceBadges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  credibilityCard: { gap: 12, marginBottom: 4 },
  credHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
});
