// Stock ticker pill/tag component
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Colors from '@/constants/colors';
import { StockRecommendation } from '@/services/aiAnalysis';

interface StockTagProps {
  stock: StockRecommendation;
  onPress?: () => void;
}

const relevanceColors = {
  high: { bg: 'rgba(34, 197, 94, 0.15)', border: Colors.accent, text: Colors.accent },
  medium: { bg: 'rgba(245, 158, 11, 0.15)', border: Colors.warning, text: Colors.warning },
  low: { bg: 'rgba(148, 163, 184, 0.15)', border: Colors.neutral, text: Colors.neutral },
};

export function StockTag({ stock, onPress }: StockTagProps) {
  const colors = relevanceColors[stock.relevance];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={[
        styles.tag,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.ticker, { color: colors.text }]}>{stock.ticker}</Text>
      <Text style={styles.company} numberOfLines={1}>{stock.company}</Text>
    </TouchableOpacity>
  );
}

// Compact version for lists
export function StockTagCompact({ stock }: { stock: StockRecommendation }) {
  const colors = relevanceColors[stock.relevance];

  return (
    <View
      style={[
        styles.tagCompact,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.tickerCompact, { color: colors.text }]}>{stock.ticker}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
    minWidth: 80,
  },
  ticker: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  company: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  tagCompact: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  tickerCompact: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
