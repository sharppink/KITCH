// 과거 분석 기록 카드 컴포넌트
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Colors from '@/constants/colors';
import { HistoryItem } from '@/hooks/useAnalysisHistory';
import { formatDate, getContentTypeIcon, getSentimentColor, getCredibilityColor, getContentTypeLabel } from '@/utils/formatters';
import { StockTagCompact } from '@/components/StockTag';

interface HistoryCardProps {
  item: HistoryItem;
  onPress: () => void;
  onDelete: () => void;
  onFolderPress?: () => void;
  currentFolderName?: string;
  highlightKeyword?: string;
}

function HighlightText({
  text, keyword, style, numberOfLines,
}: {
  text: string; keyword?: string; style: any; numberOfLines?: number;
}) {
  if (!keyword || !text) return <Text style={style} numberOfLines={numberOfLines}>{text}</Text>;
  const lower = text.toLowerCase();
  const kw    = keyword.toLowerCase();
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let idx    = lower.indexOf(kw, cursor);
  while (idx !== -1) {
    if (idx > cursor) parts.push(text.slice(cursor, idx));
    parts.push(
      <Text key={idx} style={[style, styles.highlight]}>{text.slice(idx, idx + kw.length)}</Text>
    );
    cursor = idx + kw.length;
    idx    = lower.indexOf(kw, cursor);
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <Text style={style} numberOfLines={numberOfLines}>{parts}</Text>;
}

export function HistoryCard({ item, onPress, onDelete, onFolderPress, currentFolderName, highlightKeyword }: HistoryCardProps) {
  const { result } = item;
  const typeInfo      = getContentTypeIcon(result.contentType);
  const sentimentColor = getSentimentColor(result.sentiment);
  const credColor      = getCredibilityColor(result.credibilityScore);

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDelete();
  };

  const summary = result.summary?.[0] ?? '';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.card}>
      <View style={[styles.stripe, { backgroundColor: sentimentColor }]} />
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.typeRow}>
            <Feather name={typeInfo.name as any} size={13} color={Colors.textSecondary} />
            <Text style={styles.typeLabel}>{getContentTypeLabel(result.contentType)}</Text>
          </View>
          <Text style={styles.date}>{formatDate(new Date(result.analyzedAt))}</Text>
        </View>

        <HighlightText text={result.sourceTitle ?? ''} keyword={highlightKeyword} style={styles.title} numberOfLines={1} />
        <HighlightText text={summary} keyword={highlightKeyword} style={styles.summary} numberOfLines={2} />

        {/* 메모 미리보기 */}
        {!!item.memo && (
          <View style={styles.memoPreview}>
            <Feather name="edit-3" size={11} color={Colors.primary} />
            <Text style={styles.memoPreviewText} numberOfLines={1}>{item.memo}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <View style={styles.scoreRow}>
            <Text style={[styles.score, { color: credColor }]}>{result.credibilityScore ?? '-'}</Text>
            <Text style={styles.scoreLabel}> 신뢰도</Text>
          </View>
          <View style={styles.stocks}>
            {(result.recommendedStocks ?? []).slice(0, 2).map((s) => (
              <StockTagCompact key={s.ticker} stock={s} />
            ))}
          </View>

          {/* 폴더 지정 버튼 */}
          {onFolderPress && (
            <TouchableOpacity
              style={[styles.folderBtn, currentFolderName && styles.folderBtnActive]}
              onPress={(e) => { e.stopPropagation(); Haptics.selectionAsync(); onFolderPress(); }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              activeOpacity={0.7}
            >
              <Feather name="folder" size={12} color={currentFolderName ? Colors.primary : Colors.textTertiary} />
              {currentFolderName ? (
                <Text style={styles.folderBtnText} numberOfLines={1}>{currentFolderName}</Text>
              ) : null}
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="trash-2" size={14} color={Colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden', marginBottom: 10,
  },
  stripe: { width: 4 },
  content: { flex: 1, padding: 14, gap: 6 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  typeLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: Colors.textSecondary, letterSpacing: 1 },
  date: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textTertiary },
  title: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.text },
  summary: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  highlight: { backgroundColor: '#FFF0A0', color: Colors.text, fontFamily: 'Inter_600SemiBold' },
  memoPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.primaryBg, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start', maxWidth: '100%',
  },
  memoPreviewText: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.primary, flex: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline' },
  score: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  scoreLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textTertiary },
  stocks: { flex: 1, flexDirection: 'row', gap: 4, flexWrap: 'nowrap' },

  /* 폴더 버튼 */
  folderBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  folderBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  folderBtnText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: Colors.primary, maxWidth: 60 },
});
