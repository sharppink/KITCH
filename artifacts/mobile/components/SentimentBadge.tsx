// 심리 배지 컴포넌트
import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Sentiment } from '@/services/aiAnalysis';
import { getSentimentColor, getSentimentLabel } from '@/utils/formatters';

interface SentimentBadgeProps {
  sentiment: Sentiment;
}

const sentimentIcons: Record<Sentiment, keyof typeof Feather.glyphMap> = {
  positive: 'trending-up',
  negative: 'trending-down',
  neutral: 'minus',
};

export function SentimentBadge({ sentiment }: SentimentBadgeProps) {
  const color = getSentimentColor(sentiment);
  const label = getSentimentLabel(sentiment);
  const icon = sentimentIcons[sentiment];

  return (
    <View style={[styles.badge, { backgroundColor: `${color}20`, borderColor: `${color}50` }]}>
      <Feather name={icon} size={14} color={color} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}


const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    gap: 5,
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.3,
  },
});
