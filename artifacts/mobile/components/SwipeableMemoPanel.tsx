import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Colors from '@/constants/colors';

const PANEL_WIDTH = 220;
const HANDLE_WIDTH = 26;
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  memo: string;
  onSave: (text: string) => void;
}

export function SwipeableMemoPanel({ memo, onSave }: Props) {
  const translateX = useRef(new Animated.Value(PANEL_WIDTH)).current;
  const startX = useRef(PANEL_WIDTH);
  const isOpen = useRef(false);
  const [editText, setEditText] = useState(memo);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setEditText(memo);
  }, [memo]);

  const animateOpen = () => {
    isOpen.current = true;
    setVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 72,
      friction: 11,
    }).start();
  };

  const animateClose = () => {
    isOpen.current = false;
    Animated.spring(translateX, {
      toValue: PANEL_WIDTH,
      useNativeDriver: true,
      tension: 72,
      friction: 11,
    }).start(() => setVisible(false));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 6 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.2,
      onPanResponderGrant: () => {
        startX.current = isOpen.current ? 0 : PANEL_WIDTH;
      },
      onPanResponderMove: (_, gs) => {
        const next = Math.max(0, Math.min(PANEL_WIDTH, startX.current + gs.dx));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_, gs) => {
        const projected = startX.current + gs.dx + gs.vx * 80;
        if (projected < PANEL_WIDTH / 2) {
          animateOpen();
        } else {
          animateClose();
        }
      },
    })
  ).current;

  const handleSave = () => {
    onSave(editText.trim());
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    animateClose();
  };

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateX }] }]}
      {...panResponder.panHandlers}
    >
      {/* Handle tab */}
      <TouchableOpacity
        style={styles.handle}
        onPress={() => (isOpen.current ? animateClose() : animateOpen())}
        activeOpacity={0.75}
      >
        <Feather name="edit-3" size={13} color="#fff" />
        <Text style={styles.handleLabel}>{'메\n모'}</Text>
      </TouchableOpacity>

      {/* Panel */}
      <View style={styles.panel}>
        <View style={styles.dragBar} />

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <Feather name="edit-3" size={14} color={Colors.primary} />
            </View>
            <Text style={styles.headerTitle}>메모</Text>
          </View>
          <TouchableOpacity
            onPress={animateClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="x" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          multiline
          value={editText}
          onChangeText={setEditText}
          placeholder="이 콘텐츠에 대한 생각을 자유롭게 적어보세요."
          placeholderTextColor={Colors.textTertiary}
          textAlignVertical="top"
          scrollEnabled
        />

        <TouchableOpacity
          style={[styles.saveBtn, !editText.trim() && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!editText.trim() && !memo}
          activeOpacity={0.8}
        >
          <Feather name="check" size={14} color="#fff" />
          <Text style={styles.saveBtnText}>저장</Text>
        </TouchableOpacity>

        {memo.trim() !== '' && editText.trim() === '' && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => { onSave(''); animateClose(); }}
            activeOpacity={0.7}
          >
            <Text style={styles.clearBtnText}>메모 삭제</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 160,
    bottom: 160,
    right: 0,
    width: HANDLE_WIDTH + PANEL_WIDTH,
    flexDirection: 'row',
    zIndex: 999,
  },
  handle: {
    width: HANDLE_WIDTH,
    backgroundColor: Colors.primary,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  handleLabel: {
    fontSize: 9,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 12,
  },
  panel: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    padding: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  dragBar: {
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerIcon: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: Colors.text,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.bg,
    borderRadius: 10,
    padding: 10,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.text,
    lineHeight: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 9,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#fff',
  },
  clearBtn: { alignItems: 'center', paddingVertical: 2 },
  clearBtnText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.textTertiary,
    textDecorationLine: 'underline',
  },
});
