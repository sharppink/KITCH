// Animated loading overlay shown during AI analysis
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Colors from '@/constants/colors';

const MESSAGES = [
  'Extracting content...',
  'Running AI analysis...',
  'Scoring credibility...',
  'Finding stock signals...',
  'Generating insights...',
];

interface AnalysisLoadingOverlayProps {
  visible: boolean;
  contentType: 'news' | 'screenshot' | 'youtube';
}

export function AnalysisLoadingOverlay({ visible, contentType }: AnalysisLoadingOverlayProps) {
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.6)).current;
  const [messageIndex, setMessageIndex] = React.useState(0);

  useEffect(() => {
    if (visible) {
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.6, duration: 700, useNativeDriver: true }),
        ])
      ).start();

      // Cycle through messages
      const interval = setInterval(() => {
        setMessageIndex((prev) => (prev + 1) % MESSAGES.length);
      }, 700);

      return () => clearInterval(interval);
    } else {
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      pulseAnim.stopAnimation();
    }
  }, [visible]);

  if (!visible) return null;

  const typeLabel =
    contentType === 'news'
      ? 'article'
      : contentType === 'screenshot'
      ? 'screenshot'
      : 'video';

  return (
    <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
      <View style={styles.card}>
        {/* Animated logo circles */}
        <View style={styles.loaderContainer}>
          {[0, 1, 2].map((i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  opacity: pulseAnim,
                  transform: [
                    {
                      scale: pulseAnim.interpolate({
                        inputRange: [0.6, 1],
                        outputRange: [0.8, 1 - i * 0.1],
                      }),
                    },
                  ],
                  marginLeft: i > 0 ? -16 : 0,
                  zIndex: 3 - i,
                  backgroundColor: i === 0 ? Colors.primary : i === 1 ? Colors.accent : Colors.warning,
                },
              ]}
            />
          ))}
        </View>

        <Text style={styles.title}>Analyzing your {typeLabel}</Text>
        <Text style={styles.message}>{MESSAGES[messageIndex]}</Text>

        {/* Progress dots */}
        <View style={styles.progressDots}>
          {MESSAGES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                i === messageIndex && styles.progressDotActive,
              ]}
            />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    backdropFilter: 'blur(10px)',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    width: 260,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  loaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: Colors.background,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    color: Colors.text,
    textAlign: 'center',
  },
  message: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    minHeight: 20,
  },
  progressDots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  progressDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.border,
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
    width: 14,
  },
});
