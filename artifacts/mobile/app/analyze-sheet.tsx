import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';

const OPTIONS = [
  {
    type: 'news' as const,
    icon: 'link' as const,
    label: '뉴스 기사',
    desc: 'URL 붙여넣기 또는 공유 버튼으로 바로 핵심 정리',
    color: Colors.primary,
  },
  {
    type: 'youtube' as const,
    icon: 'youtube' as const,
    label: '유튜브 영상',
    desc: '영상 URL 붙여넣기 또는 공유 버튼으로 바로 요약',
    color: '#EF4444',
  },
];

export default function AnalyzeSheet() {
  const insets = useSafeAreaInsets();

  const handleSelect = (type: string) => {
    router.dismiss();
    setTimeout(() => {
      router.push({ pathname: '/input', params: { type } });
    }, 200);
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.grabber} />
      <Text style={styles.title}>무엇을 저장할까요?</Text>
      <Text style={styles.subtitle}>저장할 콘텐츠 형태를 고르세요</Text>

      <View style={styles.options}>
        {OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.type}
            style={styles.optionRow}
            activeOpacity={0.75}
            onPress={() => handleSelect(opt.type)}
          >
            <View style={[styles.optionIcon, { backgroundColor: opt.color + '22' }]}>
              <Feather name={opt.icon} size={22} color={opt.color} />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionLabel}>{opt.label}</Text>
              <Text style={styles.optionDesc}>{opt.desc}</Text>
            </View>
            <Feather name="chevron-right" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.cancelBtn} onPress={() => router.dismiss()} activeOpacity={0.7}>
        <Text style={styles.cancelText}>취소</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  grabber: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center', marginBottom: 20,
  },
  title: {
    fontFamily: 'Inter_700Bold', fontSize: 20, color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary,
    marginBottom: 24,
  },
  options: { gap: 10 },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  optionIcon: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  optionText: { flex: 1 },
  optionLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.text, marginBottom: 2 },
  optionDesc: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },

  cancelBtn: {
    marginTop: 16, paddingVertical: 14, alignItems: 'center',
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
  },
  cancelText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.textSecondary },
});
