// AI 분석 서비스 - 실제 OpenAI 연동 (API 서버 경유)

export type Sentiment = 'positive' | 'neutral' | 'negative';
export type ContentType = 'news' | 'youtube' | 'twitter';

export interface StockRecommendation {
  ticker: string;
  company: string;
  relevance: 'high' | 'medium' | 'low';
}

export interface AnalysisResult {
  summary: string[];
  detailedSummary?: string;
  credibilityScore: number;
  criteriaScores?: number[];
  sentiment: Sentiment;
  recommendedStocks: StockRecommendation[];
  contentType: ContentType;
  sourceTitle: string;
  analyzedAt: Date;
  cannotAnalyze?: boolean;
  geoBlocked?: boolean;
  sectorTags?: string[];
  sectorKeywords?: string;
}

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : 'http://localhost:8080/api';

async function callAnalyzeAPI(
  path: string,
  body: Record<string, string>,
): Promise<AnalysisResult> {
  const res = await fetch(`${API_BASE}/analyze/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as any).error || '분석 요청에 실패했습니다');
  }

  const data = await res.json();
  return {
    ...data,
    analyzedAt: new Date(data.analyzedAt ?? Date.now()),
  } as AnalysisResult;
}

export async function analyzeNewsLink(url: string): Promise<AnalysisResult> {
  return callAnalyzeAPI('news', { url });
}

export async function analyzeYouTube(videoId: string, url: string): Promise<AnalysisResult> {
  return callAnalyzeAPI('youtube', { url: url || `https://youtu.be/${videoId}` });
}

export async function analyzeTwitter(url: string): Promise<AnalysisResult> {
  return callAnalyzeAPI('twitter', { url });
}

export function isValidTwitterUrl(url: string): boolean {
  return /https?:\/\/(twitter\.com|x\.com)\/\w+\/status\/\d+/.test(url);
}
