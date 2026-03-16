// Input Screen - handles news links, screenshots, and YouTube URLs
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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

type ContentType = 'news' | 'screenshot' | 'youtube';

const typeConfig = {
  news: {
    title: 'News Article',
    subtitle: 'Paste a news or financial article URL',
    placeholder: 'https://reuters.com/markets/...',
    icon: 'link' as const,
    inputLabel: 'Article URL',
    buttonLabel: 'Analyze Article',
  },
  screenshot: {
    title: 'Financial Screenshot',
    subtitle: 'Upload a screenshot of financial data, charts, or reports',
    placeholder: 'Tap the upload button below to select an image',
    icon: 'image' as const,
    inputLabel: 'Or paste extracted text (optional)',
    buttonLabel: 'Analyze Screenshot',
  },
  youtube: {
    title: 'YouTube Video',
    subtitle: 'Paste a YouTube link for AI analysis of the investment content',
    placeholder: 'https://youtube.com/watch?v=...',
    icon: 'youtube' as const,
    inputLabel: 'YouTube URL',
    buttonLabel: 'Analyze Video',
  },
};

export default function InputScreen() {
  const insets = useSafeAreaInsets();
  const { type } = useLocalSearchParams<{ type: ContentType }>();
  const contentType: ContentType = type ?? 'news';
  const config = typeConfig[contentType];

  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  const { saveToHistory } = useAnalysisHistory();

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is required to upload screenshots.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setError(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const validate = (): boolean => {
    if (contentType === 'screenshot') {
      if (!selectedImage && !inputText.trim()) {
        setError('Please upload a screenshot or paste some text to analyze.');
        return false;
      }
    } else if (contentType === 'youtube') {
      if (!inputText.trim()) {
        setError('Please paste a YouTube URL.');
        return false;
      }
      if (!isValidYouTubeUrl(inputText.trim())) {
        setError('Please enter a valid YouTube URL (e.g. https://youtu.be/...)');
        return false;
      }
    } else {
      if (!inputText.trim()) {
        setError('Please enter a URL to analyze.');
        return false;
      }
      if (!inputText.startsWith('http')) {
        setError('Please enter a valid URL starting with http:// or https://');
        return false;
      }
    }
    setError(null);
    return true;
  };

  const handleAnalyze = async () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsAnalyzing(true);
    setError(null);

    try {
      let result;

      if (contentType === 'news') {
        result = await analyzeNewsLink(inputText.trim());
      } else if (contentType === 'screenshot') {
        const ocrResult = await extractTextFromImage(selectedImage || '');
        result = await analyzeScreenshot(ocrResult.text);
      } else {
        const videoId = extractVideoId(inputText.trim())!;
        const videoInfo = await fetchVideoInfo(videoId);
        result = await analyzeYouTube(videoId, videoInfo.title);
      }

      const historyItem = await saveToHistory(result, inputText.trim() || undefined);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      router.replace({
        pathname: '/result',
        params: { historyId: historyItem.id, cached: 'true' },
      });
    } catch (err) {
      console.error('Analysis failed:', err);
      setError('Analysis failed. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <View style={[styles.container]}>
      <StatusBar barStyle="light-content" />
      <AnalysisLoadingOverlay visible={isAnalyzing} contentType={contentType} />

      {/* Header */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Feather name={config.icon} size={16} color={Colors.primary} />
          <Text style={styles.headerTitle}>{config.title}</Text>
        </View>
        <View style={styles.backButton} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + 120 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Subtitle */}
          <Text style={styles.subtitle}>{config.subtitle}</Text>

          {/* Screenshot-specific: image upload area */}
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
                    <Text style={styles.imageOverlayText}>Change Image</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <View style={styles.uploadIconBg}>
                    <Feather name="upload" size={28} color={Colors.primary} />
                  </View>
                  <Text style={styles.uploadTitle}>Upload Screenshot</Text>
                  <Text style={styles.uploadSubtitle}>
                    Tap to select from your photo library
                  </Text>
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

          {/* URL / text input */}
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
                onChangeText={(t) => {
                  setInputText(t);
                  if (error) setError(null);
                }}
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

          {/* Tips card */}
          <Card style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <Feather name="zap" size={14} color={Colors.warning} />
              <Text style={styles.tipsTitle}>Tips for best results</Text>
            </View>
            {getTips(contentType).map((tip, i) => (
              <View key={i} style={styles.tip}>
                <View style={styles.tipDot} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </Card>

          {/* Error */}
          {error && (
            <View style={styles.errorContainer}>
              <Feather name="alert-circle" size={14} color={Colors.negative} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky analyze button */}
      <View
        style={[styles.analyzeButtonContainer, { paddingBottom: insets.bottom + 16 }]}
      >
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
    </View>
  );
}

function getTips(type: ContentType): string[] {
  switch (type) {
    case 'news':
      return [
        'Paste the full article URL for best analysis',
        'Works best with Reuters, Bloomberg, CNBC, etc.',
        'Paywalled articles may have limited analysis',
      ];
    case 'screenshot':
      return [
        'Ensure text in the image is clear and legible',
        'Screenshots of earnings, charts, or news work great',
        'Higher resolution images produce better OCR results',
      ];
    case 'youtube':
      return [
        'Supports youtube.com and youtu.be links',
        'Best for analysis-focused financial videos',
        'Works with shorts, regular videos, and embeds',
      ];
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: Colors.text,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  imageUploadArea: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
    marginBottom: 20,
    minHeight: 180,
    backgroundColor: Colors.surface,
  },
  imageUploadAreaFilled: {
    borderStyle: 'solid',
    borderColor: Colors.primary,
  },
  uploadPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 10,
  },
  uploadIconBg: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  uploadTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: Colors.text,
  },
  uploadSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  uploadFormats: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  formatTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: Colors.border,
  },
  formatText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  imagePreviewWrapper: {
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 220,
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 10,
  },
  imageOverlayText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#fff',
  },
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  inputIcon: {
    marginTop: 2,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.text,
    textAlignVertical: 'top',
    minHeight: 22,
  },
  tipsCard: {
    gap: 10,
    marginBottom: 16,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  tipsTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.warning,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  tipDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.border,
    marginTop: 6,
  },
  tipText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 10,
    padding: 12,
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.negative,
    flex: 1,
  },
  analyzeButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
  },
  analyzeButtonDisabled: {
    opacity: 0.5,
  },
  analyzeButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#fff',
  },
});
