import { Router } from "express";
import OpenAI from "openai";
import * as cheerio from "cheerio";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { YoutubeTranscript } = require("youtube-transcript") as { YoutubeTranscript: { fetchTranscript: (id: string, opts?: { lang?: string }) => Promise<{ text: string }[]> } };

const router = Router();

function extractJSON(raw: string): Record<string, any> {
  // 마크다운 코드블록 제거 후 JSON 파싱
  const cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // JSON 덩어리 찾기
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {}
    }
    return {};
  }
}

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `당신은 투자 분석 AI입니다. 주어진 콘텐츠를 분석하여 다음 JSON 형식으로 정확히 응답하세요:
{
  "summary": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"],
  "credibilityScore": 숫자(0-100),
  "sentiment": "positive" | "neutral" | "negative",
  "recommendedStocks": [
    {"ticker": "티커", "company": "회사명(한국어)", "relevance": "high" | "medium" | "low"}
  ],
  "riskLevel": "low" | "medium" | "high",
  "sourceTitle": "콘텐츠 제목"
}

규칙:
- summary는 반드시 3개, 각각 한국어로 50자 내외
- credibilityScore: 출처 신뢰도, 정보 구체성, 데이터 근거 기반
- sentiment: 투자 관점에서 긍정/중립/부정
- recommendedStocks: 콘텐츠와 관련된 종목 2-5개 (없으면 빈 배열)
- riskLevel: 투자 위험도
- JSON만 응답, 다른 텍스트 금지`;

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// POST /api/analyze/news
router.post("/news", async (req, res) => {
  const { url } = req.body as { url?: string };
  if (!url) {
    res.status(400).json({ error: "url이 필요합니다" });
    return;
  }

  try {
    // 기사 내용 크롤링
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; KITCH-AI/1.0; +https://kitch.app)",
      },
      signal: AbortSignal.timeout(10000),
    });
    const html = await response.text();
    const $ = cheerio.load(html);

    // 불필요한 요소 제거
    $("script, style, nav, footer, header, aside, .ad, .advertisement").remove();

    const title = $("title").text().trim() ||
      $("h1").first().text().trim() ||
      "기사";

    // 본문 추출 (article 태그 우선, 없으면 body)
    const articleText =
      $("article").text() ||
      $("main").text() ||
      $(".article-body, .article-content, .news-content, #articleBody").text() ||
      $("body").text();

    const cleanText = articleText
      .replace(/\s+/g, " ")
      .replace(/\n+/g, "\n")
      .trim()
      .slice(0, 4000); // 토큰 절약

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `다음 뉴스 기사를 투자 관점에서 분석해주세요.\n\n제목: ${title}\nURL: ${url}\n\n내용:\n${cleanText}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = extractJSON(raw);

    res.json({
      ...parsed,
      contentType: "news",
      sourceTitle: parsed.sourceTitle || title,
      analyzedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("뉴스 분석 오류:", err.message);
    res.status(500).json({ error: "분석 중 오류가 발생했습니다: " + err.message });
  }
});

// POST /api/analyze/youtube
router.post("/youtube", async (req, res) => {
  const { url } = req.body as { url?: string };
  if (!url) {
    res.status(400).json({ error: "url이 필요합니다" });
    return;
  }

  const videoId = extractYouTubeId(url);
  if (!videoId) {
    res.status(400).json({ error: "유효한 YouTube URL이 아닙니다" });
    return;
  }

  try {
    // 자막 추출 시도
    let transcriptText = "";
    let videoTitle = "유튜브 영상";

    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: "ko",
      });
      transcriptText = transcript.map((t) => t.text).join(" ").slice(0, 4000);
    } catch {
      try {
        const transcript = await YoutubeTranscript.fetchTranscript(videoId);
        transcriptText = transcript.map((t) => t.text).join(" ").slice(0, 4000);
      } catch {
        transcriptText = "(자막을 불러올 수 없습니다 — 영상 정보만으로 분석)";
      }
    }

    // YouTube oEmbed로 제목 가져오기
    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
        { signal: AbortSignal.timeout(5000) }
      );
      const oembed = await oembedRes.json() as { title?: string };
      videoTitle = oembed.title || videoTitle;
    } catch {}

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `다음 유튜브 투자 영상을 분석해주세요.\n\n제목: ${videoTitle}\nURL: ${url}\n\n자막:\n${transcriptText}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = extractJSON(raw);

    res.json({
      ...parsed,
      contentType: "youtube",
      sourceTitle: parsed.sourceTitle || videoTitle,
      analyzedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("유튜브 분석 오류:", err.message);
    res.status(500).json({ error: "분석 중 오류가 발생했습니다: " + err.message });
  }
});

// POST /api/analyze/screenshot
router.post("/screenshot", async (req, res) => {
  const { imageBase64 } = req.body as { imageBase64?: string };
  if (!imageBase64) {
    res.status(400).json({ error: "imageBase64가 필요합니다" });
    return;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "이 투자 관련 스크린샷(차트, 실적표, 보고서 등)을 분석해주세요.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = extractJSON(raw);

    res.json({
      ...parsed,
      contentType: "screenshot",
      sourceTitle: parsed.sourceTitle || "스크린샷 분석",
      analyzedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("스크린샷 분석 오류:", err.message);
    res.status(500).json({ error: "분석 중 오류가 발생했습니다: " + err.message });
  }
});

export default router;
