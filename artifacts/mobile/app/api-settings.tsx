/**
 * 원격 API 베이스 URL 설정 (ngrok, Vercel 등 공인 주소).
 * 같은 Wi‑Fi가 아니어도 인터넷만 되면 접속 가능하도록 저장된 주소를 최우선 사용합니다.
 */
import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import {
  clearApiBaseOverride,
  getApiBaseUrl,
  getStoredApiBaseOverride,
  normalizeApiBaseInput,
  setApiBaseOverride,
} from '@/constants/apiBase';

export default function ApiSettingsScreen() {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');
  const [resolved, setResolved] = useState(() => getApiBaseUrl());
  const [saving, setSaving] = useState(false);

  const refreshFromStorage = useCallback(() => {
    const stored = getStoredApiBaseOverride();
    setDraft(stored ?? '');
    setResolved(getApiBaseUrl());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshFromStorage();
    }, [refreshFromStorage])
  );

  const onSave = async () => {
    const trimmed = draft.trim();
    setSaving(true);
    try {
      if (!trimmed) {
        await clearApiBaseOverride();
        setResolved(getApiBaseUrl());
        if (Platform.OS === 'web') {
          window.alert?.('저장된 API 주소를 지웠습니다. 기본 규칙(환경 변수·LAN)을 사용합니다.');
        } else {
          Alert.alert('완료', '저장된 API 주소를 지웠습니다. 기본 규칙을 사용합니다.');
        }
        return;
      }
      const normalized = normalizeApiBaseInput(trimmed);
      await setApiBaseOverride(trimmed);
      setResolved(getApiBaseUrl());
      setDraft(normalized);
      if (Platform.OS === 'web') {
        window.alert?.(`저장했습니다.\n${normalized}`);
      } else {
        Alert.alert('저장 완료', normalized);
      }
    } finally {
      setSaving(false);
    }
  };

  const onClear = async () => {
    setSaving(true);
    try {
      await clearApiBaseOverride();
      setDraft('');
      setResolved(getApiBaseUrl());
      if (Platform.OS === 'web') {
        window.alert?.('앱에 저장된 API 주소를 삭제했습니다.');
      } else {
        Alert.alert('완료', '앱에 저장된 API 주소를 삭제했습니다.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="chevron-left" size={26} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>API 주소 설정</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.lead}>
          휴대폰이 PC와 같은 Wi‑Fi가 아니어도 되려면, 백엔드가 인터넷에서 열린 주소(예: ngrok, Vercel
          배포 URL)를 아래에 넣어 저장하세요. 끝에 <Text style={styles.mono}>/api</Text>가 없으면 자동으로
          붙입니다.
        </Text>

        <Text style={styles.label}>API 베이스 URL</Text>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="예: https://xxxx.ngrok-free.app 또는 https://your-api.vercel.app"
          placeholderTextColor={Colors.textTertiary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />

        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.primaryBtn, saving && styles.btnDisabled]}
            onPress={onSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={Colors.textInverse} />
            ) : (
              <Text style={styles.primaryBtnText}>저장</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryBtn, saving && styles.btnDisabled]}
            onPress={onClear}
            disabled={saving}
          >
            <Text style={styles.secondaryBtnText}>저장 삭제</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>현재 사용 중인 주소</Text>
          <Text style={styles.infoUrl} selectable>
            {resolved}
          </Text>
          <Text style={styles.hint}>
            빌드 시 <Text style={styles.mono}>EXPO_PUBLIC_API_URL</Text> 또는{' '}
            <Text style={styles.mono}>EXPO_PUBLIC_DOMAIN</Text>이 설정되어 있으면, 저장값이 없을 때 그쪽을
            씁니다.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  lead: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  mono: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 13,
    color: Colors.primary,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.surface,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  secondaryBtnText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  infoBox: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  infoUrl: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.text,
    marginBottom: 12,
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textTertiary,
  },
});
