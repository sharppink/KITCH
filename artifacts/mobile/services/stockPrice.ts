// 종목 시세 조회 서비스
import { getApiBaseUrl } from '@/constants/apiBase';

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
  const res = await fetch(`${getApiBaseUrl()}/analyze/stock/price?ticker=${encodeURIComponent(ticker)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as any).error || '시세를 가져올 수 없습니다');
  }
  return res.json();
}
