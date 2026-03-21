import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: 'error' | 'success';
  onHide?: () => void;
  topOffset?: number;
}

export function Toast({ visible, message, type = 'error', onHide, topOffset = 60 }: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-16)).current;

  useEffect(() => {
    if (visible) {
      opacity.setValue(0);
      translateY.setValue(-16);
      Animated.parallel([
        Animated.spring(opacity, { toValue: 1, useNativeDriver: true, speed: 20 }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 20 }),
      ]).start();
      const t = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -16, duration: 250, useNativeDriver: true }),
        ]).start(() => onHide?.());
      }, 3200);
      return () => clearTimeout(t);
    }
  }, [visible, message]);

  if (!visible) return null;

  const bg = type === 'error' ? '#C0392B' : '#16A34A';

  return (
    <Animated.View
      style={[
        styles.container,
        { top: topOffset, backgroundColor: bg, opacity, transform: [{ translateY }] },
      ]}
      pointerEvents="none"
    >
      <Feather
        name={type === 'error' ? 'alert-circle' : 'check-circle'}
        size={15}
        color="#fff"
      />
      <Text style={styles.text} numberOfLines={2}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 10,
  },
  text: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#fff',
    lineHeight: 18,
  },
});
