import { Router } from "express";

const router = Router();

let cache: { data: MarketData; cachedAt: number } | null = null;
const CACHE_TTL_MS = 60 * 1000; // 1분 캐시

interface MarketData {
  name: string;
  price: number;
  change: number;
  changePct: number;
  isUp: boolean;
  updatedAt: string;
}

async function fetchKospi(): Promise<MarketData> {
  const url =
    "https://query1.finance.yahoo.com/v8/finance/chart/%5EKS11?interval=1d&range=1d";

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) throw new Error(`Yahoo Finance 응답 오류: ${res.status}`);

  const json = (await res.json()) as any;
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error("데이터 파싱 실패");

  const price: number = meta.regularMarketPrice ?? 0;
  const prevClose: number = meta.chartPreviousClose ?? meta.previousClose ?? price;
  const change = price - prevClose;
  const changePct = prevClose ? (change / prevClose) * 100 : 0;

  return {
    name: "코스피",
    price,
    change,
    changePct,
    isUp: change >= 0,
    updatedAt: new Date().toISOString(),
  };
}

// GET /api/market/kospi
router.get("/kospi", async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.cachedAt < CACHE_TTL_MS) {
      res.json(cache.data);
      return;
    }

    const data = await fetchKospi();
    cache = { data, cachedAt: now };
    res.json(data);
  } catch (err: any) {
    console.error("[Market] KOSPI 조회 오류:", err.message);
    // 캐시가 있으면 만료돼도 반환
    if (cache) {
      res.json({ ...cache.data, stale: true });
      return;
    }
    res.status(500).json({ error: "시세 조회 실패" });
  }
});

export default router;
