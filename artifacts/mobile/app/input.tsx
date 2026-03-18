// 입력 화면 - 뉴스 링크, 스크린샷, 유튜브 URL 처리
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { KiwoomBottomBar } from '@/components/KiwoomBottomBar';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Image,
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
import { analyzeNewsLink, analyzeScreenshot, analyzeYouTube } from '@/services/aiAnalysis';
import { extractTextFromImage } from '@/services/ocr';
import { extractVideoId, fetchVideoInfo, isValidYouTubeUrl } from '@/services/youtube';
import { useAnalysisHistory } from '@/hooks/useAnalysisHistory';
import { Card } from '@/components/Card';
import { Toast } from '@/components/Toast';

type ContentType = 'news' | 'screenshot' | 'youtube';

const typeConfig = {
  news: {
    title: '뉴스 기사',
    subtitle: '분석할 뉴스 또는 금융 기사의 URL을 입력해주세요',
    placeholder: 'https://news.einfomax.co.kr/...',
    icon: 'link' as const,
    inputLabel: '기사 URL',
    buttonLabel: '기사 분석하기',
  },
  screenshot: {
    title: '금융 스크린샷',
    subtitle: '실적 보고서, 차트, 공시 등의 스크린샷을 업로드해주세요',
    placeholder: '아래 버튼을 눌러 이미지를 선택하세요',
    icon: 'image' as const,
    inputLabel: '텍스트 직접 입력 (선택사항)',
    buttonLabel: '스크린샷 분석하기',
  },
  youtube: {
    title: '유튜브 영상',
    subtitle: '투자 관련 유튜브 영상 링크를 입력해주세요',
    placeholder: 'https://youtube.com/watch?v=...',
    icon: 'youtube' as const,
    inputLabel: '유튜브 URL',
    buttonLabel: '영상 분석하기',
  },
};

export default function InputScreen() {
  const insets = useSafeAreaInsets();
  const { type, sharedUrl } = useLocalSearchParams<{ type: ContentType; sharedUrl?: string }>();
  const contentType: ContentType = type ?? 'news';
  const config = typeConfig[contentType];

  const [inputText, setInputText] = useState(sharedUrl ?? '');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
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

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast('사진 접근 권한이 필요합니다. 설정에서 권한을 허용해주세요.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const validate = (): boolean => {
    if (contentType === 'screenshot') {
      if (!selectedImage && !inputText.trim()) {
        showToast('스크린샷을 업로드하거나 텍스트를 입력해주세요.');
        return false;
      }
    } else if (contentType === 'youtube') {
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
      } else if (contentType === 'screenshot') {
        let imageBase64 = '';
        if (selectedImage) {
          const response = await fetch(selectedImage);
          const blob = await response.blob();
          imageBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const b64 = (reader.result as string).split(',')[1];
              resolve(b64 ?? '');
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
        result = await analyzeScreenshot(imageBase64 || inputText.trim());
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

      {/* 헤더 — 키움 스타일 진한 남색 */}
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

          {/* 스크린샷 이미지 업로드 영역 */}
          {contentType === 'screenshot' && (
            <TouchableOpacity
              onPress={handlePickImage}
              activeOpacity={0.8}
              style={[styles.imageUploadArea, selectedImage && styles.imageUploadAreaFilled]}
            >
              {selectedImage ? (
                <View style={styles.imagePreviewWrapper}>
                  <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                  <View style={styles.imageOverlay}>
                    <Feather name="refresh-cw" size={20} color="#fff" />
                    <Text style={styles.imageOverlayText}>이미지 변경</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <View style={styles.uploadIconBg}>
                    <Feather name="upload" size={28} color={Colors.primary} />
                  </View>
                  <Text style={styles.uploadTitle}>스크린샷 업로드</Text>
                  <Text style={styles.uploadSubtitle}>탭하여 사진 라이브러리에서 선택하세요</Text>
                  <View style={styles.uploadFormats}>
                    {['PNG', 'JPG', 'HEIC'].map((fmt) => (
                      <View key={fmt} style={styles.formatTag}>
                        <Text style={styles.formatText}>{fmt}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* URL / 텍스트 입력 */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>{config.inputLabel}</Text>
            <View style={styles.inputWrapper}>
              <Feather
                name={contentType === 'screenshot' ? 'type' : 'link-2'}
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
                keyboardType={contentType === 'screenshot' ? 'default' : 'url'}
                returnKeyType="done"
                multiline={contentType === 'screenshot'}
                numberOfLines={contentType === 'screenshot' ? 4 : 1}
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

      {/* 분석 시작 버튼 (하단 고정) */}
      <View style={styles.analyzeButtonContainer}>
        <TouchableOpacity
          style={[styles.analyzeButton, isAnalyzing && styles.analyzeButtonDisabled]}
          onPress={handleAnalyze}
          activeOpacity={0.85}
          disabled={isAnalyzing}
        >
          <Feather name="cpu" size={18} color="#fff" />
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
        '전체 기사 URL을 붙여넣으면 가장 정확한 분석이 가능합니다',
        '로이터, 블룸버그, 한국경제, 연합뉴스 등의 기사를 지원합니다',
        '유료 구독 기사는 분석이 제한될 수 있습니다',
      ];
    case 'screenshot':
      return [
        '이미지 내 텍스트가 선명하게 보여야 정확한 분석이 가능합니다',
        '실적 발표, 차트, 애널리스트 보고서 스크린샷에 최적화되어 있습니다',
        '해상도가 높을수록 OCR 정확도가 향상됩니다',
      ];
    case 'youtube':
      return [
        'youtube.com 및 youtu.be 링크를 모두 지원합니다',
        '투자 분석, 종목 리뷰, 경제 뉴스 영상에 최적화되어 있습니다',
        '쇼츠, 일반 영상, 임베드 링크 모두 지원합니다',
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
  imageUploadArea: { borderRadius: 16, borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed', overflow: 'hidden', marginBottom: 20, minHeight: 180, backgroundColor: Colors.surface },
  imageUploadAreaFilled: { borderStyle: 'solid', borderColor: Colors.primary },
  uploadPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  uploadIconBg: { width: 60, height: 60, borderRadius: 18, backgroundColor: 'rgba(75, 95, 214, 0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  uploadTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: Colors.text },
  uploadSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
  uploadFormats: { flexDirection: 'row', gap: 6, marginTop: 4 },
  formatTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: Colors.border },
  formatText: { fontFamily: 'Inter_500Medium', fontSize: 10, color: Colors.textSecondary, letterSpacing: 0.5 },
  imagePreviewWrapper: { position: 'relative' },
  imagePreview: { width: '100%', height: 220, resizeMode: 'cover' },
  imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 10 },
  imageOverlayText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#fff' },
  inputSection: { marginBottom: 16 },
  inputLabel: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.textSecondary, marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  inputIcon: { marginTop: 2 },
  input: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.text, textAlignVertical: 'top', minHeight: 22 },
  tipsCard: { gap: 10, marginBottom: 16 },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  tipsTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.warning },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tipDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.border, marginTop: 6 },
  tipText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary, flex: 1, lineHeight: 18 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)', borderRadius: 10, padding: 12 },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.negative, flex: 1 },
  analyzeButtonContainer: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
  analyzeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16 },
  analyzeButtonDisabled: { opacity: 0.5 },
  analyzeButtonText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#fff' },
});
