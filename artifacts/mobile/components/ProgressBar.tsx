// Animated progress bar for credibility score display
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Colors from '@/constants/colors';
import { getCredibilityColor } from '@/utils/formatters';

interface ProgressBarProps {
  value: number;       // 0-100
  height?: number;
  animated?: boolean;
  color?: string;
}

export function ProgressBar({
  value,
  height = 8,
  animated = true,
  color,
}: ProgressBarProps) {
  const animValue = useRef(new Animated.Value(0)).current;
  const clampedValue = Math.max(0, Math.min(100, value));
  const barColor = color ?? getCredibilityColor(clampedValue);

  useEffect(() => {
    if (animated) {
      Animated.timing(animValue, {
        toValue: clampedValue,
        duration: 900,
        delay: 200,
        useNativeDriver: false,
      }).start();
    } else {
      animValue.setValue(clampedValue);
    }
  }, [clampedValue, animated]);

  const widthInterpolated = animValue.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.track, { height }]}>
      <Animated.View
        style={[
          styles.fill,
          {
            width: widthInterpolated,
            height,
            backgroundColor: barColor,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: Colors.border,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 999,
  },
});
