import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Colors from '@/constants/colors';
import { StockRecommendation } from '@/services/aiAnalysis';

interface StockTagProps {
  stock: StockRecommendation;
  onPress?: () => void;
}

const relevanceColors = {
  high: { bg: 'rgba(34, 197, 94, 0.12)', border: Colors.accent, text: Colors.accent },
  medium: { bg: 'rgba(245, 158, 11, 0.12)', border: Colors.warning, text: Colors.warning },
  low: { bg: 'rgba(148, 163, 184, 0.12)', border: Colors.neutral, text: Colors.neutral },
};

function isKoreanCode(ticker: string): boolean {
  return /^\d{6}$/.test(ticker.trim());
}

function isEtfTicker(ticker: string): boolean {
  return /[가-힣]/.test(ticker) || /^[A-Z]{2,}\s/.test(ticker);
}

function getPrimaryLabel(stock: StockRecommendation): string {
  if (isKoreanCode(stock.ticker)) {
    return stock.company;
  }
  if (isEtfTicker(stock.ticker)) {
    return stock.ticker;
  }
  return stock.company || stock.ticker;
}

function getSecondaryLabel(stock: StockRecommendation): string | null {
  if (isKoreanCode(stock.ticker)) {
    return stock.ticker;
  }
  if (isEtfTicker(stock.ticker)) {
    return null;
  }
  if (stock.ticker && stock.company && stock.ticker !== stock.company) {
    return stock.ticker;
  }
  return null;
}

export function StockTag({ stock, onPress }: StockTagProps) {
  const colors = relevanceColors[stock.relevance];
  const primary = getPrimaryLabel(stock);
  const secondary = getSecondaryLabel(stock);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={[styles.tag, { backgroundColor: colors.bg, borderColor: colors.border }]}
    >
      <Text style={[styles.primaryLabel, { color: Colors.text }]} numberOfLines={1}>
        {primary}
      </Text>
      {secondary ? (
        <Text style={[styles.secondaryLabel, { color: colors.text }]}>{secondary}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

export function StockTagCompact({ stock }: { stock: StockRecommendation }) {
  const colors = relevanceColors[stock.relevance];
  const label = stock.company || stock.ticker;

  return (
    <View style={[styles.tagCompact, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <Text style={[styles.compactLabel, { color: colors.text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 2,
    minWidth: 70,
    maxWidth: 160,
  },
  primaryLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
  },
  secondaryLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    letterSpacing: 0.4,
    opacity: 0.85,
  },
  tagCompact: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: 130,
  },
  compactLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
});
