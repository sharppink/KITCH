// History card for displaying past analyses
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Colors from '@/constants/colors';
import { HistoryItem } from '@/hooks/useAnalysisHistory';
import { formatDate, getContentTypeIcon, getSentimentColor, getSentimentLabel, getCredibilityColor } from '@/utils/formatters';
import { StockTagCompact } from '@/components/StockTag';

interface HistoryCardProps {
  item: HistoryItem;
  onPress: () => void;
  onDelete: () => void;
}

export function HistoryCard({ item, onPress, onDelete }: HistoryCardProps) {
  const { result } = item;
  const typeInfo = getContentTypeIcon(result.contentType);
  const sentimentColor = getSentimentColor(result.sentiment);
  const credColor = getCredibilityColor(result.credibilityScore);

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDelete();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={styles.card}
    >
      {/* Left stripe by sentiment */}
      <View style={[styles.stripe, { backgroundColor: sentimentColor }]} />

      <View style={styles.content}>
        {/* Header row */}
        <View style={styles.header}>
          <View style={styles.typeRow}>
            <Feather name={typeInfo.name as any} size={13} color={Colors.textSecondary} />
            <Text style={styles.typeLabel}>{result.contentType.toUpperCase()}</Text>
          </View>
          <Text style={styles.date}>{formatDate(new Date(result.analyzedAt))}</Text>
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={1}>{result.sourceTitle}</Text>

        {/* Summary first bullet */}
        <Text style={styles.summary} numberOfLines={2}>
          {result.summary[0]}
        </Text>

        {/* Footer: score + stocks + delete */}
        <View style={styles.footer}>
          <View style={styles.scoreRow}>
            <Text style={[styles.score, { color: credColor }]}>
              {result.credibilityScore}
            </Text>
            <Text style={styles.scoreLabel}> credibility</Text>
          </View>

          <View style={styles.stocks}>
            {result.recommendedStocks.slice(0, 3).map((s) => (
              <StockTagCompact key={s.ticker} stock={s} />
            ))}
          </View>

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
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: 10,
  },
  stripe: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 14,
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typeLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  date: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.textTertiary,
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.text,
  },
  summary: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  score: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
  },
  scoreLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.textTertiary,
  },
  stocks: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'nowrap',
  },
});
