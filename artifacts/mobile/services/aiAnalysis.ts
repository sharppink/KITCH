// AI Analysis Service - Mock implementation
// In production, this would call an LLM API with the extracted text

export type Sentiment = 'positive' | 'neutral' | 'negative';
export type RiskLevel = 'low' | 'medium' | 'high';
export type ContentType = 'news' | 'screenshot' | 'youtube';

export interface StockRecommendation {
  ticker: string;
  company: string;
  relevance: 'high' | 'medium' | 'low';
}

export interface AnalysisResult {
  summary: string[];           // 3 bullet points
  credibilityScore: number;    // 0-100
  sentiment: Sentiment;
  recommendedStocks: StockRecommendation[];
  riskLevel: RiskLevel;
  contentType: ContentType;
  sourceTitle: string;
  analyzedAt: Date;
}

// Mock responses for different content types
const mockNewsResponses: AnalysisResult[] = [
  {
    summary: [
      'Federal Reserve signals potential rate cuts in Q2 2025, boosting tech sector optimism',
      'Inflation data shows steady decline to 2.8%, closer to the 2% target set by policymakers',
      'Market analysts predict a broad rally in growth stocks if monetary easing begins as expected',
    ],
    credibilityScore: 87,
    sentiment: 'positive',
    recommendedStocks: [
      { ticker: 'AAPL', company: 'Apple Inc.', relevance: 'high' },
      { ticker: 'NVDA', company: 'NVIDIA Corp.', relevance: 'high' },
      { ticker: 'MSFT', company: 'Microsoft Corp.', relevance: 'medium' },
      { ticker: 'GOOGL', company: 'Alphabet Inc.', relevance: 'medium' },
    ],
    riskLevel: 'low',
    contentType: 'news',
    sourceTitle: 'Fed Rate Decision Analysis',
    analyzedAt: new Date(),
  },
  {
    summary: [
      'China semiconductor restrictions tighten, limiting US chip exports by an estimated $15B annually',
      'Major chipmakers face headwinds as geopolitical tensions escalate in the Asia-Pacific region',
      'Supply chain diversification to India and Vietnam accelerates, but transition will take 2–3 years',
    ],
    credibilityScore: 72,
    sentiment: 'negative',
    recommendedStocks: [
      { ticker: 'TSM', company: 'Taiwan Semiconductor', relevance: 'high' },
      { ticker: 'INTC', company: 'Intel Corp.', relevance: 'high' },
      { ticker: 'AMD', company: 'Advanced Micro Devices', relevance: 'medium' },
      { ticker: 'QCOM', company: 'Qualcomm Inc.', relevance: 'low' },
    ],
    riskLevel: 'high',
    contentType: 'news',
    sourceTitle: 'Semiconductor Trade Report',
    analyzedAt: new Date(),
  },
];

const mockYouTubeResponses: AnalysisResult[] = [
  {
    summary: [
      'Video presents bullish thesis on EV adoption, citing 40% YoY growth in charging infrastructure',
      'Analyst highlights Tesla\'s FSD revenue potential as a software margin story worth watching',
      'Caution advised on short-term volatility due to raw material costs and competitive pressures',
    ],
    credibilityScore: 61,
    sentiment: 'positive',
    recommendedStocks: [
      { ticker: 'TSLA', company: 'Tesla Inc.', relevance: 'high' },
      { ticker: 'RIVN', company: 'Rivian Automotive', relevance: 'medium' },
      { ticker: 'LI', company: 'Li Auto Inc.', relevance: 'medium' },
      { ticker: 'NIO', company: 'NIO Inc.', relevance: 'low' },
    ],
    riskLevel: 'medium',
    contentType: 'youtube',
    sourceTitle: 'EV Market Deep Dive',
    analyzedAt: new Date(),
  },
];

const mockScreenshotResponses: AnalysisResult[] = [
  {
    summary: [
      'Screenshot shows strong earnings beat for major bank — EPS $2.34 vs. expected $2.01',
      'Net interest margin expanded 15bps QoQ, suggesting profitable lending environment',
      'Management raised full-year guidance by 8%, driven by consumer loan growth',
    ],
    credibilityScore: 79,
    sentiment: 'positive',
    recommendedStocks: [
      { ticker: 'JPM', company: 'JPMorgan Chase', relevance: 'high' },
      { ticker: 'BAC', company: 'Bank of America', relevance: 'high' },
      { ticker: 'GS', company: 'Goldman Sachs', relevance: 'medium' },
      { ticker: 'WFC', company: 'Wells Fargo', relevance: 'low' },
    ],
    riskLevel: 'low',
    contentType: 'screenshot',
    sourceTitle: 'Earnings Report Screenshot',
    analyzedAt: new Date(),
  },
];

/**
 * Simulate network latency for a realistic UX
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Pick a random item from an array
 */
const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/**
 * Analyze news link content
 */
export async function analyzeNewsLink(url: string): Promise<AnalysisResult> {
  await delay(2000 + Math.random() * 1500); // 2-3.5s simulated processing
  const result = pickRandom(mockNewsResponses);
  return {
    ...result,
    sourceTitle: extractDomainTitle(url),
    analyzedAt: new Date(),
  };
}

/**
 * Analyze screenshot OCR text
 */
export async function analyzeScreenshot(ocrText: string): Promise<AnalysisResult> {
  await delay(2500 + Math.random() * 1500); // 2.5-4s for OCR + analysis
  return {
    ...pickRandom(mockScreenshotResponses),
    analyzedAt: new Date(),
  };
}

/**
 * Analyze YouTube video content
 */
export async function analyzeYouTube(videoId: string, title: string): Promise<AnalysisResult> {
  await delay(2000 + Math.random() * 1000);
  return {
    ...pickRandom(mockYouTubeResponses),
    sourceTitle: title || 'YouTube Video Analysis',
    analyzedAt: new Date(),
  };
}

// Helper to extract a readable title from a URL
function extractDomainTitle(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    return `${hostname.charAt(0).toUpperCase() + hostname.slice(1)} Article`;
  } catch {
    return 'News Article Analysis';
  }
}
