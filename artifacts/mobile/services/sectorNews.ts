// 섹터 관련 뉴스 조회 서비스
const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : 'http://localhost:8080/api';

export interface NewsItem {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
}

export async function fetchSectorNews(query: string): Promise<NewsItem[]> {
  try {
    const res = await fetch(
      `${API_BASE}/analyze/sector/news?q=${encodeURIComponent(query)}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.news ?? [];
  } catch {
    return [];
  }
}

export function formatNewsAge(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  const days = Math.floor(hrs / 24);
  return `${days}일 전`;
}
