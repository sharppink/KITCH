// 종목 행 - 실시간 시세 인라인 표시 컴포넌트
import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Colors from '@/constants/colors';
import { StockRecommendation } from '@/services/aiAnalysis';
import { fetchStockPrice, StockPrice } from '@/services/stockPrice';

interface Props {
  stock: StockRecommendation;
  onPress: () => void;
}

const RELEVANCE_COLORS = { high: '#16A34A', medium: '#D97706', low: '#6B7280' };
const RELEVANCE_LABELS = { high: '높음', medium: '보통', low: '낮음' };

export function StockPriceRow({ stock, onPress }: Props) {
  const [price, setPrice] = useState<StockPrice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetchStockPrice(stock.ticker)
      .then(setPrice)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [stock.ticker]);

  const isUp = (price?.change ?? 0) >= 0;
  const priceColor = isUp ? Colors.positive : Colors.negative;
  const arrow = isUp ? '▲' : '▼';
  const dotColor = RELEVANCE_COLORS[stock.relevance];

  const formatPrice = (p: StockPrice) =>
    p.currency === 'KRW'
      ? p.price.toLocaleString('ko-KR') + '원'
      : '$' + p.price.toFixed(2);

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      {/* 연관성 인디케이터 */}
      <View style={[styles.relevanceDot, { backgroundColor: dotColor }]} />

      {/* 종목 정보 */}
      <View style={styles.stockInfo}>
        <View style={styles.tickerRow}>
          <Text style={styles.ticker}>{stock.ticker}</Text>
          <View style={[styles.relevanceBadge, { backgroundColor: dotColor + '18' }]}>
            <Text style={[styles.relevanceText, { color: dotColor }]}>
              {RELEVANCE_LABELS[stock.relevance]}
            </Text>
          </View>
        </View>
        <Text style={styles.company} numberOfLines={1}>{stock.company}</Text>
      </View>

      {/* 시세 */}
      <View style={styles.priceSection}>
        {loading ? (
          <ActivityIndicator size="small" color={Colors.textTertiary} />
        ) : error ? (
          <Text style={styles.errorText}>—</Text>
        ) : price ? (
          <>
            <Text style={[styles.priceValue, { color: priceColor }]}>
              {formatPrice(price)}
            </Text>
            <View style={[styles.changeBadge, { backgroundColor: priceColor + '18' }]}>
              <Text style={[styles.changePct, { color: priceColor }]}>
                {arrow} {Math.abs(price.changePercent).toFixed(2)}%
              </Text>
            </View>
          </>
        ) : null}
      </View>

      <Feather name="chevron-right" size={14} color={Colors.textTertiary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  relevanceDot: {
    width: 8, height: 8, borderRadius: 4, flexShrink: 0,
  },
  stockInfo: { flex: 1, gap: 2, minWidth: 0 },
  tickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ticker: { fontFamily: 'Inter_700Bold', fontSize: 14, color: Colors.text },
  relevanceBadge: {
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  relevanceText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  company: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary },

  priceSection: { alignItems: 'flex-end', gap: 3 },
  priceValue: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  changeBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  changePct: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textTertiary },
});
