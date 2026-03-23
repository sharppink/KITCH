// 종목 시세 조회 + 주문 바텀시트
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Colors from '@/constants/colors';
import { StockRecommendation } from '@/services/aiAnalysis';
import { fetchStockPrice, StockPrice } from '@/services/stockPrice';
import { apiErrorMessage } from '@/utils/apiErrorMessage';

interface Props {
  stock: StockRecommendation | null;
  visible: boolean;
  onClose: () => void;
}

export function StockPriceSheet({ stock, visible, onClose }: Props) {
  const { width: windowWidth } = useWindowDimensions();
  /**
   * 모바일·웹에서 과도하게 큰 글자 방지
   * - RN Web은 가끔 창 너비(600px+)를 그대로 써 scale=1이 되어 시트가 비대해짐 → 폭은 430으로 캡
   * - 전체 scale 상한 0.92로 한 단계 축소 (현재가 등)
   */
  const layout = useMemo(() => {
    const w = Math.min(windowWidth, 430);
    const raw = w / 430;
    const scale = Math.min(0.92, Math.max(0.72, raw));
    const f = (px: number) => Math.round(px * scale);
    return {
      scale,
      f,
      sheetPadH: f(20),
      sheetPadB: f(36),
      company: f(20),
      ticker: f(13),
      currentPrice: Math.min(f(36), 30),
      changeAmt: f(16),
      changePct: f(14),
      marketMeta: f(11),
      statLabel: f(11),
      statValue: f(13),
      statsPad: f(16),
      statsRadius: f(14),
      orderBtnPadV: f(16),
      orderBtnText: f(16),
      closeIcon: Math.max(18, f(22)),
    };
  }, [windowWidth]);

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
        .catch((e) => setError(apiErrorMessage(e, '시세를 불러올 수 없습니다')))
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
        <Pressable
          style={[
            styles.sheet,
            { paddingHorizontal: layout.sheetPadH, paddingBottom: layout.sheetPadB },
          ]}
          onPress={() => {}}
        >
          <View style={styles.handle} />

          {/* 헤더 */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={[styles.company, { fontSize: layout.company }]}>{stock.company}</Text>
              <Text style={[styles.ticker, { fontSize: layout.ticker }]}>{stock.ticker}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="x" size={layout.closeIcon} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* 본문 */}
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator color={Colors.primary} size="large" />
              <Text style={[styles.loadingText, { fontSize: layout.f(13) }]}>시세 불러오는 중...</Text>
            </View>
          ) : error ? (
            <View style={styles.centerBox}>
              <Feather name="wifi-off" size={layout.f(28)} color={Colors.textTertiary} />
              <Text style={[styles.errorText, { fontSize: layout.f(13) }]}>{error}</Text>
            </View>
          ) : price ? (
            <View style={styles.priceSection}>
              {/* 현재가 */}
              <Text style={[styles.currentPrice, { color: priceColor, fontSize: layout.currentPrice }]}>
                {formatPrice(price.price)}
              </Text>
              <View style={styles.changeRow}>
                <Text style={[styles.changeAmt, { color: priceColor, fontSize: layout.changeAmt }]}>
                  {arrow} {formatPrice(Math.abs(price.change))}
                </Text>
                <View style={[styles.changePctBadge, { backgroundColor: priceColor + '18' }]}>
                  <Text style={[styles.changePct, { color: priceColor, fontSize: layout.changePct }]}>
                    {price.changePercent >= 0 ? '+' : ''}{price.changePercent.toFixed(2)}%
                  </Text>
                </View>
              </View>
              <Text style={[styles.marketMeta, { fontSize: layout.marketMeta }]}>
                {getMarketStateLabel(price.marketState)} · {price.exchangeName}
              </Text>

              {/* 통계 */}
              <View
                style={[
                  styles.statsRow,
                  { padding: layout.statsPad, borderRadius: layout.statsRadius },
                ]}
              >
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { fontSize: layout.statLabel }]}>전일 종가</Text>
                  <Text style={[styles.statValue, { fontSize: layout.statValue }]}>
                    {formatPrice(price.prevClose)}
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { fontSize: layout.statLabel }]}>변동폭</Text>
                  <Text style={[styles.statValue, { color: priceColor, fontSize: layout.statValue }]}>
                    {arrow} {formatPrice(Math.abs(price.change))}
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { fontSize: layout.statLabel }]}>변동률</Text>
                  <Text style={[styles.statValue, { color: priceColor, fontSize: layout.statValue }]}>
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
                style={[styles.orderBtnGradient, { paddingVertical: layout.orderBtnPadV }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Feather name="trending-up" size={Math.max(14, layout.f(16))} color="#fff" />
                <Text style={[styles.orderBtnText, { fontSize: layout.orderBtnText }]}>
                  주문하러가기
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View style={[styles.orderInfoBox, { padding: layout.f(16), borderRadius: layout.f(16), gap: layout.f(10) }]}>
              <View style={styles.orderInfoHeader}>
                <LinearGradient
                  colors={['#12146A', '#0052CC']}
                  style={[styles.orderInfoIcon, { width: layout.f(26), height: layout.f(26), borderRadius: layout.f(8) }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Feather name="info" size={Math.max(12, layout.f(14))} color="#fff" />
                </LinearGradient>
                <Text style={[styles.orderInfoTitle, { fontSize: layout.f(14) }]}>키움증권 앱에서 주문하세요</Text>
              </View>
              <Text style={[styles.orderInfoDesc, { fontSize: layout.f(13), lineHeight: layout.f(20) }]}>
                KITCH는 투자 정보 요약 서비스입니다.{'\n'}
                실제 매매 주문은 키움증권 MTS에서 진행해주세요.{'\n'}
                검색: <Text style={styles.orderInfoTicker}>{stock.ticker} ({stock.company})</Text>
              </Text>
              <TouchableOpacity
                style={[styles.orderInfoClose, { paddingHorizontal: layout.f(14), paddingVertical: layout.f(6) }]}
                onPress={() => setShowOrderInfo(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.orderInfoCloseText, { fontSize: layout.f(12) }]}>닫기</Text>
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
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
  },
  sheet: {
    alignSelf: 'stretch',
    width: '100%',
    maxWidth: '100%',
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    fontFamily: 'Inter_400Regular', color: Colors.textSecondary, letterSpacing: 0.3,
  },
  company: {
    fontFamily: 'Inter_700Bold', color: Colors.text,
  },
  divider: { height: 1, backgroundColor: Colors.border, marginBottom: 14 },

  centerBox: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 32, gap: 10,
  },
  loadingText: {
    fontFamily: 'Inter_400Regular', color: Colors.textSecondary,
  },
  errorText: {
    fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'center',
  },

  priceSection: { gap: 6, marginBottom: 16 },
  currentPrice: {
    fontFamily: 'Inter_700Bold', letterSpacing: -1,
  },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  changeAmt: { fontFamily: 'Inter_600SemiBold' },
  changePctBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  changePct: { fontFamily: 'Inter_600SemiBold' },
  marketMeta: {
    fontFamily: 'Inter_400Regular', color: Colors.textTertiary, marginTop: 2,
  },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    marginTop: 8,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, backgroundColor: Colors.border },
  statLabel: { fontFamily: 'Inter_400Regular', color: Colors.textTertiary },
  statValue: { fontFamily: 'Inter_600SemiBold', color: Colors.text },

  orderBtn: { marginTop: 4, borderRadius: 14, overflow: 'hidden' },
  orderBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8,
  },
  orderBtnText: { fontFamily: 'Inter_700Bold', color: '#fff' },

  orderInfoBox: {
    marginTop: 4, backgroundColor: Colors.primaryBg,
    borderWidth: 1, borderColor: Colors.border,
  },
  orderInfoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderInfoIcon: {
    alignItems: 'center', justifyContent: 'center',
  },
  orderInfoTitle: { fontFamily: 'Inter_600SemiBold', color: Colors.text },
  orderInfoDesc: {
    fontFamily: 'Inter_400Regular', color: Colors.textSecondary,
  },
  orderInfoTicker: { fontFamily: 'Inter_700Bold', color: Colors.primary },
  orderInfoClose: {
    alignSelf: 'flex-end',
    borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  orderInfoCloseText: { fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
});
