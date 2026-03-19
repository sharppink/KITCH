// 입력 화면 - 뉴스 링크, 유튜브 URL 처리
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { KiwoomBottomBar } from '@/components/KiwoomBottomBar';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { AnalysisLoadingOverlay } from '@/components/AnalysisLoadingOverlay';
import { analyzeNewsLink, analyzeYouTube } from '@/services/aiAnalysis';
import { extractVideoId, isValidYouTubeUrl } from '@/services/youtube';
import { useAnalysisHistory } from '@/hooks/useAnalysisHistory';
import { Card } from '@/components/Card';
import { Toast } from '@/components/Toast';

type ContentType = 'news' | 'youtube';

const typeConfig = {
  news: {
    title: '뉴스 기사 저장',
    subtitle: '기사 URL을 붙여넣으면 핵심 내용만 골라서 보여드려요',
    placeholder: 'https://news.einfomax.co.kr/...',
    icon: 'link' as const,
    inputLabel: '기사 URL',
    buttonLabel: '저장하고 요약 보기',
  },
  youtube: {
    title: '유튜브 영상 저장',
    subtitle: '영상 링크를 붙여넣으면 핵심 내용을 텍스트로 정리해드려요',
    placeholder: 'https://youtube.com/watch?v=...',
    icon: 'youtube' as const,
    inputLabel: '유튜브 URL',
    buttonLabel: '저장하고 요약 보기',
  },
};

export default function InputScreen() {
  const insets = useSafeAreaInsets();
  const { type, sharedUrl } = useLocalSearchParams<{ type: ContentType; sharedUrl?: string }>();
  const contentType: ContentType = type === 'youtube' ? 'youtube' : 'news';
  const config = typeConfig[contentType];

  const [inputText, setInputText] = useState(sharedUrl ?? '');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const { saveToHistory } = useAnalysisHistory();

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(false);
    setTimeout(() => setToastVisible(true), 50);
  };

  const validate = (): boolean => {
    if (contentType === 'youtube') {
      if (!inputText.trim()) {
        showToast('유튜브 URL을 입력해주세요.');
        return false;
      }
      if (!isValidYouTubeUrl(inputText.trim())) {
        showToast('올바른 유튜브 URL을 입력해주세요. (예: https://youtu.be/...)');
        return false;
      }
    } else {
      if (!inputText.trim()) {
        showToast('기사 URL을 입력해주세요.');
        return false;
      }
      if (!inputText.startsWith('http')) {
        showToast('http:// 또는 https://로 시작하는 URL을 입력해주세요.');
        return false;
      }
    }
    return true;
  };

  const handleAnalyze = async () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsAnalyzing(true);

    try {
      let result;
      if (contentType === 'news') {
        result = await analyzeNewsLink(inputText.trim());
      } else {
        const videoId = extractVideoId(inputText.trim())!;
        result = await analyzeYouTube(videoId, inputText.trim());
      }
      const historyItem = await saveToHistory(result, inputText.trim() || undefined);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({ pathname: '/result', params: { historyId: historyItem.id, cached: 'true' } });
    } catch (err) {
      console.error('분석 오류:', err);
      showToast((err as Error)?.message || '분석에 실패했습니다. 다시 시도해주세요.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#12146A" />
      <AnalysisLoadingOverlay visible={isAnalyzing} contentType={contentType} />
      <Toast
        visible={toastVisible}
        message={toastMsg}
        topOffset={insets.top + 68}
        onHide={() => setToastVisible(false)}
      />

      {/* 헤더 */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Feather name={config.icon} size={16} color="rgba(255,255,255,0.8)" />
          <Text style={styles.headerTitle}>{config.title}</Text>
        </View>
        <View style={styles.backButton} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: 20 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.subtitle}>{config.subtitle}</Text>

          {/* URL 입력 */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>{config.inputLabel}</Text>
            <View style={styles.inputWrapper}>
              <Feather
                name="link-2"
                size={16}
                color={Colors.textTertiary}
                style={styles.inputIcon}
              />
              <TextInput
                ref={inputRef}
                style={styles.input}
                value={inputText}
                onChangeText={(t) => { setInputText(t); }}
                placeholder={config.placeholder}
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="done"
              />
            </View>
          </View>

          {/* 팁 카드 */}
          <Card style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <Feather name="zap" size={14} color={Colors.warning} />
              <Text style={styles.tipsTitle}>정확한 분석을 위한 팁</Text>
            </View>
            {getTips(contentType).map((tip, i) => (
              <View key={i} style={styles.tip}>
                <View style={styles.tipDot} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </Card>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* 저장 버튼 (하단 고정) */}
      <View style={styles.analyzeButtonContainer}>
        <TouchableOpacity
          style={[styles.analyzeButton, isAnalyzing && styles.analyzeButtonDisabled]}
          onPress={handleAnalyze}
          activeOpacity={0.85}
          disabled={isAnalyzing}
        >
          <Feather name="bookmark" size={18} color="#fff" />
          <Text style={styles.analyzeButtonText}>{config.buttonLabel}</Text>
        </TouchableOpacity>
      </View>
      <KiwoomBottomBar />
    </View>
  );
}

function getTips(type: ContentType): string[] {
  switch (type) {
    case 'news':
      return [
        '기사 URL 전체를 그대로 붙여넣으면 됩니다',
        '한국경제, 연합뉴스, 블룸버그, 로이터 등 대부분 지원해요',
        '유료 구독 기사는 내용을 불러오지 못할 수 있어요',
      ];
    case 'youtube':
      return [
        'youtube.com 및 youtu.be 링크 모두 지원해요',
        '투자 분석, 종목 리뷰, 경제 뉴스 영상에 잘 맞아요',
        '쇼츠, 일반 영상, 임베드 링크도 모두 됩니다',
      ];
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#12146A' },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#FFFFFF' },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.textSecondary, marginBottom: 20, lineHeight: 21 },
  inputSection: { marginBottom: 16 },
  inputLabel: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.textSecondary, marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  inputIcon: { marginTop: 0 },
  input: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.text },
  tipsCard: { gap: 10, marginBottom: 16 },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  tipsTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.warning },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tipDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.border, marginTop: 6 },
  tipText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary, flex: 1, lineHeight: 18 },
  analyzeButtonContainer: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
  analyzeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16 },
  analyzeButtonDisabled: { opacity: 0.5 },
  analyzeButtonText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#fff' },
});
