// 종목 시세 조회 서비스
const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : 'http://localhost:8080/api';

export interface StockPrice {
  ticker: string;
  price: number;
  prevClose: number;
  change: number;
  changePercent: number;
  currency: string;
  marketState: string;
  shortName: string;
  exchangeName: string;
}

export async function fetchStockPrice(ticker: string): Promise<StockPrice> {
  const res = await fetch(`${API_BASE}/analyze/stock/price?ticker=${encodeURIComponent(ticker)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as any).error || '시세를 가져올 수 없습니다');
  }
  return res.json();
}
