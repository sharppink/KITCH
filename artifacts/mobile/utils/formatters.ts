// 유틸리티 포매터 - InvestLens 한글 버전

import { Sentiment } from '@/services/aiAnalysis';
import Colors from '@/constants/colors';

export function getCredibilityLabel(score: number): string {
  if (score >= 80) return '신뢰도 높음';
  if (score >= 60) return '신뢰도 보통';
  if (score >= 40) return '신뢰도 낮음';
  return '신뢰도 매우 낮음';
}

export function getCredibilityColor(score: number): string {
  if (score >= 80) return Colors.credibilityHigh;
  if (score >= 60) return Colors.credibilityMedium;
  return Colors.credibilityLow;
}

export function getSentimentColor(sentiment: Sentiment): string {
  switch (sentiment) {
    case 'positive': return Colors.positive;
    case 'negative': return Colors.negative;
    case 'neutral': return Colors.neutral;
  }
}

export function getSentimentLabel(sentiment: Sentiment): string {
  switch (sentiment) {
    case 'positive': return '강세';
    case 'negative': return '약세';
    case 'neutral': return '중립';
  }
}


export function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;

  return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}

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

export function getContentTypeIcon(
  contentType: string
): { name: string; family: 'Feather' | 'Ionicons' } {
  switch (contentType) {
    case 'news': return { name: 'link', family: 'Feather' };
    case 'screenshot': return { name: 'image', family: 'Feather' };
    case 'youtube': return { name: 'youtube', family: 'Feather' };
    default: return { name: 'file', family: 'Feather' };
  }
}

export function getContentTypeLabel(contentType: string): string {
  switch (contentType) {
    case 'news': return '뉴스';
    case 'screenshot': return '스크린샷';
    case 'youtube': return '유튜브';
    default: return '콘텐츠';
  }
}
