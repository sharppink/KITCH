// 종목 시세 조회 + 주문 바텀시트
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Colors from '@/constants/colors';
import { StockRecommendation } from '@/services/aiAnalysis';
import { fetchStockPrice, StockPrice } from '@/services/stockPrice';

interface Props {
  stock: StockRecommendation | null;
  visible: boolean;
  onClose: () => void;
}

export function StockPriceSheet({ stock, visible, onClose }: Props) {
  const [price, setPrice] = useState<StockPrice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOrderInfo, setShowOrderInfo] = useState(false);

  useEffect(() => {
    if (visible && stock) {
      setPrice(null);
      setError('');
      setShowOrderInfo(false);
      setLoading(true);
      fetchStockPrice(stock.ticker)
        .then(setPrice)
        .catch((e) => setError(e.message || '시세를 불러올 수 없습니다'))
        .finally(() => setLoading(false));
    }
  }, [visible, stock?.ticker]);

  if (!stock) return null;

  const isKorean = /^\d{6}$/.test(stock.ticker);
  const isUp = (price?.change ?? 0) >= 0;
  const priceColor = isUp ? Colors.positive : Colors.negative;
  const arrow = isUp ? '▲' : '▼';

  const formatPrice = (p: number) =>
    price?.currency === 'KRW'
      ? p.toLocaleString('ko-KR') + '원'
      : '$' + p.toFixed(2);

  const getMarketStateLabel = (state: string) => {
    if (state === 'REGULAR') return '정규장';
    if (state === 'PRE') return '프리마켓';
    if (state === 'POST') return '애프터마켓';
    return '장 마감';
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />

          {/* 헤더 */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.ticker}>{stock.ticker}</Text>
              <Text style={styles.company}>{stock.company}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="x" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* 본문 */}
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator color={Colors.primary} size="large" />
              <Text style={styles.loadingText}>시세 불러오는 중...</Text>
            </View>
          ) : error ? (
            <View style={styles.centerBox}>
              <Feather name="wifi-off" size={28} color={Colors.textTertiary} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : price ? (
            <View style={styles.priceSection}>
              {/* 현재가 */}
              <Text style={[styles.currentPrice, { color: priceColor }]}>
                {formatPrice(price.price)}
              </Text>
              <View style={styles.changeRow}>
                <Text style={[styles.changeAmt, { color: priceColor }]}>
                  {arrow} {formatPrice(Math.abs(price.change))}
                </Text>
                <View style={[styles.changePctBadge, { backgroundColor: priceColor + '18' }]}>
                  <Text style={[styles.changePct, { color: priceColor }]}>
                    {price.changePercent >= 0 ? '+' : ''}{price.changePercent.toFixed(2)}%
                  </Text>
                </View>
              </View>
              <Text style={styles.marketMeta}>
                {getMarketStateLabel(price.marketState)} · {price.exchangeName}
              </Text>

              {/* 통계 */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>전일 종가</Text>
                  <Text style={styles.statValue}>{formatPrice(price.prevClose)}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>변동폭</Text>
                  <Text style={[styles.statValue, { color: priceColor }]}>
                    {arrow} {formatPrice(Math.abs(price.change))}
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>변동률</Text>
                  <Text style={[styles.statValue, { color: priceColor }]}>
                    {price.changePercent >= 0 ? '+' : ''}{price.changePercent.toFixed(2)}%
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          {/* 주문 버튼 */}
          {!showOrderInfo ? (
            <TouchableOpacity
              style={styles.orderBtn}
              activeOpacity={0.85}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowOrderInfo(true);
              }}
            >
              <LinearGradient
                colors={['#12146A', '#0052CC']}
                style={styles.orderBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Feather name="trending-up" size={16} color="#fff" />
                <Text style={styles.orderBtnText}>키움에서 주문하기</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View style={styles.orderInfoBox}>
              <View style={styles.orderInfoHeader}>
                <LinearGradient
                  colors={['#12146A', '#0052CC']}
                  style={styles.orderInfoIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Feather name="info" size={14} color="#fff" />
                </LinearGradient>
                <Text style={styles.orderInfoTitle}>키움증권 앱에서 주문하세요</Text>
              </View>
              <Text style={styles.orderInfoDesc}>
                KITCH는 투자 정보 요약 서비스입니다.{'\n'}
                실제 매매 주문은 키움증권 MTS에서 진행해주세요.{'\n'}
                검색: <Text style={styles.orderInfoTicker}>{stock.ticker} ({stock.company})</Text>
              </Text>
              <TouchableOpacity
                style={styles.orderInfoClose}
                onPress={() => setShowOrderInfo(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.orderInfoCloseText}>닫기</Text>
              </TouchableOpacity>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    marginTop: 12, marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: { gap: 2 },
  ticker: {
    fontFamily: 'Inter_700Bold', fontSize: 20, color: Colors.text, letterSpacing: 0.5,
  },
  company: {
    fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary,
  },
  divider: { height: 1, backgroundColor: Colors.border, marginBottom: 20 },

  centerBox: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 32, gap: 10,
  },
  loadingText: {
    fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary,
  },
  errorText: {
    fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary, textAlign: 'center',
  },

  priceSection: { gap: 8, marginBottom: 24 },
  currentPrice: {
    fontFamily: 'Inter_700Bold', fontSize: 36, letterSpacing: -1,
  },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  changeAmt: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  changePctBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  changePct: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  marketMeta: {
    fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textTertiary, marginTop: 2,
  },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 14, padding: 16,
    marginTop: 8,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, backgroundColor: Colors.border },
  statLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textTertiary },
  statValue: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.text },

  orderBtn: { marginTop: 4, borderRadius: 14, overflow: 'hidden' },
  orderBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16,
  },
  orderBtnText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#fff' },

  orderInfoBox: {
    marginTop: 4, backgroundColor: Colors.primaryBg,
    borderRadius: 16, padding: 16, gap: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  orderInfoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderInfoIcon: {
    width: 26, height: 26, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  orderInfoTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.text },
  orderInfoDesc: {
    fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary,
    lineHeight: 20,
  },
  orderInfoTicker: { fontFamily: 'Inter_700Bold', color: Colors.primary },
  orderInfoClose: {
    alignSelf: 'flex-end', paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  orderInfoCloseText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.textSecondary },
});
