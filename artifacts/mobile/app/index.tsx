// Home Screen - InvestLens main entry point
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { UploadButton } from '@/components/UploadButton';
import { useAnalysisHistory } from '@/hooks/useAnalysisHistory';
import { HistoryCard } from '@/components/HistoryCard';
import { HistoryItem } from '@/hooks/useAnalysisHistory';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { history, deleteFromHistory } = useAnalysisHistory();

  const handleViewResult = (item: HistoryItem) => {
    router.push({
      pathname: '/result',
      params: { historyId: item.id, cached: 'true' },
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <View style={styles.logoRow}>
              <LinearGradient
                colors={['#2563EB', '#22C55E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoIcon}
              >
                <Feather name="search" size={18} color="#fff" />
              </LinearGradient>
              <Text style={styles.appTitle}>InvestLens</Text>
            </View>
            <Text style={styles.tagline}>AI-powered investment analysis</Text>
          </View>

          <TouchableOpacity
            style={styles.historyIcon}
            onPress={() => {}}
            activeOpacity={0.7}
          >
            <Feather name="bell" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Hero Stats Banner */}
        <LinearGradient
          colors={['#1D4ED8', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          <View style={styles.heroBannerContent}>
            <Text style={styles.heroTitle}>Analyze Any Investment Content</Text>
            <Text style={styles.heroSubtitle}>
              Paste a link, upload a screenshot, or share a YouTube video to get instant AI-powered insights.
            </Text>
          </View>
          <View style={styles.heroStats}>
            {[
              { label: 'News', icon: 'link' as const },
              { label: 'Photos', icon: 'image' as const },
              { label: 'YouTube', icon: 'youtube' as const },
            ].map(({ label, icon }) => (
              <View key={label} style={styles.heroStat}>
                <Feather name={icon} size={20} color="rgba(255,255,255,0.9)" />
                <Text style={styles.heroStatLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Analyze Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Analyze Content</Text>

          <UploadButton
            label="Paste News Link"
            sublabel="Analyze any article or blog post"
            icon="link"
            onPress={() => router.push({ pathname: '/input', params: { type: 'news' } })}
            variant="primary"
          />

          <UploadButton
            label="Upload Screenshot"
            sublabel="Extract text from financial screenshots"
            icon="image"
            onPress={() => router.push({ pathname: '/input', params: { type: 'screenshot' } })}
            variant="secondary"
          />

          <UploadButton
            label="Analyze YouTube Video"
            sublabel="Get insights from investment videos"
            icon="youtube"
            onPress={() => router.push({ pathname: '/input', params: { type: 'youtube' } })}
            variant="secondary"
          />
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Feather name="info" size={12} color={Colors.textTertiary} />
          <Text style={styles.disclaimerText}>
            For educational purposes only. Not financial advice.
          </Text>
        </View>

        {/* Recent Analyses */}
        {history.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Analyses</Text>
              <Text style={styles.sectionCount}>{history.length}</Text>
            </View>

            {history.slice(0, 5).map((item) => (
              <HistoryCard
                key={item.id}
                item={item}
                onPress={() => handleViewResult(item)}
                onDelete={() => deleteFromHistory(item.id)}
              />
            ))}

            {history.length > 5 && (
              <TouchableOpacity style={styles.viewMore} activeOpacity={0.7}>
                <Text style={styles.viewMoreText}>View all {history.length} analyses</Text>
                <Feather name="chevron-right" size={14} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Empty state */}
        {history.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Feather name="bar-chart-2" size={32} color={Colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No analyses yet</Text>
            <Text style={styles.emptySubtitle}>
              Start by pasting a news link, uploading a screenshot, or sharing a YouTube video above.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: 46,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBanner: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
  },
  heroBannerContent: {
    marginBottom: 16,
  },
  heroTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: '#fff',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 19,
  },
  heroStats: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  heroStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroStatLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    color: Colors.text,
    marginBottom: 14,
  },
  sectionCount: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.textSecondary,
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
  },
  disclaimerText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.textTertiary,
  },
  viewMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  viewMoreText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 10,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: Colors.text,
  },
  emptySubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 20,
  },
});
