// Upload/action button with icon and press feedback
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import Colors from '@/constants/colors';

interface UploadButtonProps {
  label: string;
  sublabel?: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function UploadButton({
  label,
  sublabel,
  icon,
  onPress,
  variant = 'secondary',
  loading = false,
  disabled = false,
  style,
}: UploadButtonProps) {
  const handlePress = () => {
    if (!disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPress();
    }
  };

  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      disabled={disabled || loading}
      style={[styles.container, disabled && styles.disabled, style]}
    >
      {isPrimary ? (
        <LinearGradient
          colors={['#1D4ED8', '#2563EB', '#3B82F6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.inner}
        >
          <ButtonContent
            icon={icon}
            label={label}
            sublabel={sublabel}
            loading={loading}
            iconColor="#fff"
            textColor="#fff"
          />
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.inner,
            isOutline ? styles.outlineInner : styles.secondaryInner,
          ]}
        >
          <ButtonContent
            icon={icon}
            label={label}
            sublabel={sublabel}
            loading={loading}
            iconColor={isOutline ? Colors.primary : Colors.text}
            textColor={isOutline ? Colors.primary : Colors.text}
          />
        </View>
      )}
    </TouchableOpacity>
  );
}

function ButtonContent({
  icon,
  label,
  sublabel,
  loading,
  iconColor,
  textColor,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  sublabel?: string;
  loading: boolean;
  iconColor: string;
  textColor: string;
}) {
  return (
    <>
      <View style={styles.iconContainer}>
        {loading ? (
          <ActivityIndicator size="small" color={iconColor} />
        ) : (
          <Feather name={icon} size={22} color={iconColor} />
        )}
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
        {sublabel ? (
          <Text style={styles.sublabel}>{sublabel}</Text>
        ) : null}
      </View>
      <Feather name="chevron-right" size={18} color={Colors.textTertiary} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  secondaryInner: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
  },
  outlineInner: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  sublabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  disabled: {
    opacity: 0.5,
  },
});
