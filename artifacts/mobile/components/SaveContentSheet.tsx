import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { AnalysisLoadingOverlay } from '@/components/AnalysisLoadingOverlay';
import { analyzeNewsLink, analyzeTwitter, analyzeYouTube, isValidTwitterUrl } from '@/services/aiAnalysis';
import { extractVideoId, isValidYouTubeUrl } from '@/services/youtube';
import { useAnalysisHistory } from '@/hooks/useAnalysisHistory';

type ContentType = 'news' | 'youtube' | 'twitter';

function detectType(url: string): ContentType {
  if (isValidYouTubeUrl(url)) return 'youtube';
  if (isValidTwitterUrl(url)) return 'twitter';
  return 'news';
}

const TYPE_META: Record<ContentType, { label: string; color: string; icon: React.ComponentProps<typeof Feather>['name'] }> = {
  news:    { label: '뉴스',      color: Colors.primary, icon: 'link'    },
  youtube: { label: '유튜브',    color: '#EF4444',      icon: 'youtube' },
  twitter: { label: '트위터(X)', color: '#1D9BF0',      icon: 'twitter' },
};

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function SaveContentSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { saveToHistory } = useAnalysisHistory();

  const [inputText, setInputText]     = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg]       = useState('');
  const inputRef = useRef<TextInput>(null);

  const detectedType: ContentType = inputText.trim() ? detectType(inputText.trim()) : 'news';
  const meta = TYPE_META[detectedType];
  const hasUrl = inputText.trim().length > 0;

  useEffect(() => {
    if (visible) {
      setInputText('');
      setErrorMsg('');
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [visible]);

  const validate = (): boolean => {
    const url = inputText.trim();
    if (!url) {
      setErrorMsg('URL을 입력해주세요.');
      return false;
    }
    if (!url.startsWith('http')) {
      setErrorMsg('http:// 또는 https://로 시작하는 URL을 입력해주세요.');
      return false;
    }
    if (detectedType === 'twitter' && !isValidTwitterUrl(url)) {
      setErrorMsg('올바른 트위터 URL을 입력해주세요. (예: https://x.com/user/status/...)');
      return false;
    }
    return true;
  };

  const handleAnalyze = async () => {
    setErrorMsg('');
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsAnalyzing(true);
    try {
      const url = inputText.trim();
      let result;
      if (detectedType === 'youtube') {
        const videoId = extractVideoId(url)!;
        result = await analyzeYouTube(videoId, url);
      } else if (detectedType === 'twitter') {
        result = await analyzeTwitter(url);
      } else {
        result = await analyzeNewsLink(url);
      }
      const historyItem = await saveToHistory(result, url);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
      router.push({ pathname: '/result', params: { historyId: historyItem.id, cached: 'true' } });
    } catch (err) {
      setErrorMsg((err as Error)?.message || '분석에 실패했습니다. 다시 시도해주세요.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <AnalysisLoadingOverlay visible={isAnalyzing} contentType={detectedType} />
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kvContainer}
        >
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]} onPress={() => {}}>
            {/* 핸들 */}
            <View style={styles.handle} />

            {/* 타이틀 */}
            <View style={styles.titleRow}>
              <View style={styles.titleLeft}>
                <Feather name="bookmark" size={18} color={Colors.primary} />
                <Text style={styles.title}>콘텐츠 저장하기</Text>
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Feather name="x" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* URL 입력 */}
            <View style={[styles.inputWrapper, errorMsg ? styles.inputWrapperError : undefined]}>
              <Feather name="link-2" size={15} color={Colors.textTertiary} />
              <TextInput
                ref={inputRef}
                style={styles.input}
                value={inputText}
                onChangeText={t => { setInputText(t); setErrorMsg(''); }}
                placeholder="뉴스, 유튜브, 트위터(X) URL을 붙여넣으세요."
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="done"
                onSubmitEditing={handleAnalyze}
              />
              {inputText.length > 0 && (
                <TouchableOpacity onPress={() => setInputText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="x-circle" size={15} color={Colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>

            {/* 오류 메시지 */}
            {!!errorMsg && (
              <View style={styles.errorRow}>
                <Feather name="alert-circle" size={12} color="#E22C29" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            {/* 감지된 타입 배지 or 힌트 */}
            <View style={styles.hintRow}>
              {hasUrl ? (
                <>
                  <View style={[styles.detectedBadge, { backgroundColor: meta.color + '18', borderColor: meta.color + '40' }]}>
                    <Feather name={meta.icon} size={11} color={meta.color} />
                    <Text style={[styles.detectedText, { color: meta.color }]}>{meta.label} 감지됨</Text>
                  </View>
                </>
              ) : (
                <>
                  <Feather name="share-2" size={13} color={Colors.textTertiary} />
                  <Text style={styles.hint}>앱에서 공유하기 버튼을 누르거나, URL을 직접 붙여넣으세요.</Text>
                </>
              )}
            </View>

            {/* 분석 버튼 */}
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: hasUrl ? meta.color : Colors.primary }, isAnalyzing && styles.btnDisabled]}
              onPress={handleAnalyze}
              activeOpacity={0.85}
              disabled={isAnalyzing}
            >
              <Feather name="bookmark" size={17} color="#fff" />
              <Text style={styles.btnText}>저장하고 요약 보기</Text>
            </TouchableOpacity>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  kvContainer: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D0D0E0',
    alignSelf: 'center',
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '700', color: Colors.text },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: Colors.background,
  },
  inputWrapperError: {
    borderColor: '#E22C29',
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: -8,
  },
  errorText: {
    fontSize: 12,
    color: '#E22C29',
    flex: 1,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -4,
  },
  hint: {
    fontSize: 12,
    color: Colors.textTertiary,
    lineHeight: 18,
    flex: 1,
  },
  detectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  detectedText: {
    fontSize: 12,
    fontWeight: '600',
  },

  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 13,
    paddingVertical: 15,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
