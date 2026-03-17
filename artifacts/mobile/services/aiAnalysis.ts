// AI 분석 서비스 - 실제 OpenAI 연동 (API 서버 경유)

export type Sentiment = 'positive' | 'neutral' | 'negative';
export type ContentType = 'news' | 'screenshot' | 'youtube';

export interface StockRecommendation {
  ticker: string;
  company: string;
  relevance: 'high' | 'medium' | 'low';
}

export interface AnalysisResult {
  summary: string[];
  credibilityScore: number;
  sentiment: Sentiment;
  recommendedStocks: StockRecommendation[];
  contentType: ContentType;
  sourceTitle: string;
  analyzedAt: Date;
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

export async function analyzeScreenshot(imageBase64: string): Promise<AnalysisResult> {
  return callAnalyzeAPI('screenshot', { imageBase64 });
}

export async function analyzeYouTube(videoId: string, url: string): Promise<AnalysisResult> {
  return callAnalyzeAPI('youtube', { url: url || `https://youtu.be/${videoId}` });
}
