// AI 분석 서비스 - 목업 구현
// 실제 서비스에서는 LLM API를 호출하여 분석합니다

export type Sentiment = 'positive' | 'neutral' | 'negative';
export type RiskLevel = 'low' | 'medium' | 'high';
export type ContentType = 'news' | 'screenshot' | 'youtube';

export interface StockRecommendation {
  ticker: string;
  company: string;
  relevance: 'high' | 'medium' | 'low';
}

export interface AnalysisResult {
  summary: string[];           // 3개 핵심 요약
  credibilityScore: number;    // 0-100
  sentiment: Sentiment;
  recommendedStocks: StockRecommendation[];
  riskLevel: RiskLevel;
  contentType: ContentType;
  sourceTitle: string;
  analyzedAt: Date;
}

// 뉴스 링크 분석 목업 응답
const mockNewsResponses: AnalysisResult[] = [
  {
    summary: [
      '미 연준, 2025년 2분기 금리 인하 가능성 시사 — 기술주 중심 강세 전망',
      '소비자물가지수(CPI)가 2.8%로 하락하며 인플레이션 둔화 흐름 이어져',
      '시장 전문가들은 금리 완화 시 성장주 전반에 걸쳐 랠리가 예상된다고 분석',
    ],
    credibilityScore: 87,
    sentiment: 'positive',
    recommendedStocks: [
      { ticker: 'AAPL', company: '애플', relevance: 'high' },
      { ticker: 'NVDA', company: '엔비디아', relevance: 'high' },
      { ticker: 'MSFT', company: '마이크로소프트', relevance: 'medium' },
      { ticker: 'GOOGL', company: '알파벳', relevance: 'medium' },
    ],
    riskLevel: 'low',
    contentType: 'news',
    sourceTitle: '연준 금리 결정 분석',
    analyzedAt: new Date(),
  },
  {
    summary: [
      '미국의 반도체 수출 규제 강화로 연간 약 150억 달러 규모 수출 제한 전망',
      '지정학적 긴장 고조에 따라 주요 칩 제조사들이 불확실성에 노출될 위험 증가',
      '인도·베트남 중심의 공급망 재편이 가속화되고 있으나 이행에 2~3년 소요 예상',
    ],
    credibilityScore: 72,
    sentiment: 'negative',
    recommendedStocks: [
      { ticker: 'TSM', company: 'TSMC', relevance: 'high' },
      { ticker: 'INTC', company: '인텔', relevance: 'high' },
      { ticker: 'AMD', company: 'AMD', relevance: 'medium' },
      { ticker: 'QCOM', company: '퀄컴', relevance: 'low' },
    ],
    riskLevel: 'high',
    contentType: 'news',
    sourceTitle: '반도체 무역 동향 보고서',
    analyzedAt: new Date(),
  },
];

// 유튜브 분석 목업 응답
const mockYouTubeResponses: AnalysisResult[] = [
  {
    summary: [
      '전기차 충전 인프라가 전년 대비 40% 성장하며 EV 보급 가속화 전망을 뒷받침',
      '테슬라의 FSD 소프트웨어 매출이 수익성 개선의 핵심 동력으로 부각되고 있음',
      '원자재 비용 상승과 경쟁 심화로 단기 변동성에는 주의가 필요하다는 분석',
    ],
    credibilityScore: 61,
    sentiment: 'positive',
    recommendedStocks: [
      { ticker: 'TSLA', company: '테슬라', relevance: 'high' },
      { ticker: 'RIVN', company: '리비안', relevance: 'medium' },
      { ticker: 'LI', company: '리오토', relevance: 'medium' },
      { ticker: 'NIO', company: '니오', relevance: 'low' },
    ],
    riskLevel: 'medium',
    contentType: 'youtube',
    sourceTitle: '전기차 시장 심층 분석',
    analyzedAt: new Date(),
  },
];

// 스크린샷 분석 목업 응답
const mockScreenshotResponses: AnalysisResult[] = [
  {
    summary: [
      '주요 은행 어닝 서프라이즈 — EPS 2.34달러로 예상치 2.01달러를 크게 상회',
      '분기 순이자마진(NIM)이 15bp 확대되며 수익성 있는 대출 환경을 입증',
      '연간 가이던스를 8% 상향 조정, 소비자 대출 성장이 주요 원인으로 지목',
    ],
    credibilityScore: 79,
    sentiment: 'positive',
    recommendedStocks: [
      { ticker: 'JPM', company: 'JP모건', relevance: 'high' },
      { ticker: 'BAC', company: '뱅크오브아메리카', relevance: 'high' },
      { ticker: 'GS', company: '골드만삭스', relevance: 'medium' },
      { ticker: 'WFC', company: '웰스파고', relevance: 'low' },
    ],
    riskLevel: 'low',
    contentType: 'screenshot',
    sourceTitle: '실적 보고서 스크린샷',
    analyzedAt: new Date(),
  },
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export async function analyzeNewsLink(url: string): Promise<AnalysisResult> {
  await delay(2000 + Math.random() * 1500);
  return { ...pickRandom(mockNewsResponses), sourceTitle: extractDomainTitle(url), analyzedAt: new Date() };
}

export async function analyzeScreenshot(ocrText: string): Promise<AnalysisResult> {
  await delay(2500 + Math.random() * 1500);
  return { ...pickRandom(mockScreenshotResponses), analyzedAt: new Date() };
}

export async function analyzeYouTube(videoId: string, title: string): Promise<AnalysisResult> {
  await delay(2000 + Math.random() * 1000);
  return { ...pickRandom(mockYouTubeResponses), sourceTitle: title || '유튜브 영상 분석', analyzedAt: new Date() };
}

function extractDomainTitle(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    return `${hostname.charAt(0).toUpperCase() + hostname.slice(1)} 기사`;
  } catch {
    return '뉴스 기사 분석';
  }
}
