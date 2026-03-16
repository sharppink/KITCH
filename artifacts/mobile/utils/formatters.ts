// Utility formatters for InvestLens

import { Sentiment, RiskLevel } from '@/services/aiAnalysis';
import Colors from '@/constants/colors';

/**
 * Format a credibility score into a label
 */
export function getCredibilityLabel(score: number): string {
  if (score >= 80) return 'High Credibility';
  if (score >= 60) return 'Moderate Credibility';
  if (score >= 40) return 'Low Credibility';
  return 'Very Low Credibility';
}

/**
 * Get color for a credibility score
 */
export function getCredibilityColor(score: number): string {
  if (score >= 80) return Colors.credibilityHigh;
  if (score >= 60) return Colors.credibilityMedium;
  return Colors.credibilityLow;
}

/**
 * Get color for sentiment
 */
export function getSentimentColor(sentiment: Sentiment): string {
  switch (sentiment) {
    case 'positive':
      return Colors.positive;
    case 'negative':
      return Colors.negative;
    case 'neutral':
      return Colors.neutral;
  }
}

/**
 * Get display label for sentiment
 */
export function getSentimentLabel(sentiment: Sentiment): string {
  switch (sentiment) {
    case 'positive':
      return 'Bullish';
    case 'negative':
      return 'Bearish';
    case 'neutral':
      return 'Neutral';
  }
}

/**
 * Get color for risk level
 */
export function getRiskColor(risk: RiskLevel): string {
  switch (risk) {
    case 'low':
      return Colors.riskLow;
    case 'medium':
      return Colors.riskMedium;
    case 'high':
      return Colors.riskHigh;
  }
}

/**
 * Get display label for risk level
 */
export function getRiskLabel(risk: RiskLevel): string {
  switch (risk) {
    case 'low':
      return 'Low Risk';
    case 'medium':
      return 'Medium Risk';
    case 'high':
      return 'High Risk';
  }
}

/**
 * Format a date for display
 */
export function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Truncate a URL for display
 */
export function truncateUrl(url: string, maxLength = 40): string {
  try {
    const parsed = new URL(url);
    const display = `${parsed.hostname}${parsed.pathname}`;
    if (display.length <= maxLength) return display;
    return display.slice(0, maxLength - 3) + '...';
  } catch {
    if (url.length <= maxLength) return url;
    return url.slice(0, maxLength - 3) + '...';
  }
}

/**
 * Get content type icon name (Feather icons)
 */
export function getContentTypeIcon(
  contentType: string
): { name: string; family: 'Feather' | 'Ionicons' } {
  switch (contentType) {
    case 'news':
      return { name: 'link', family: 'Feather' };
    case 'screenshot':
      return { name: 'image', family: 'Feather' };
    case 'youtube':
      return { name: 'youtube', family: 'Feather' };
    default:
      return { name: 'file', family: 'Feather' };
  }
}
