import { Router } from "express";
import OpenAI from "openai";
import * as cheerio from "cheerio";

// Lazy-load youtube-transcript via dynamic import to use its ESM entry point.
// The package has "type":"module" but a broken CJS file — ESM import resolves correctly.
type YTInstance = { fetchTranscript: (id: string, opts?: { lang?: string }) => Promise<{ text: string }[]> };
let _ytInstance: YTInstance | null = null;
async function getYoutubeTranscript(): Promise<YTInstance> {
  if (!_ytInstance) {
    const mod = await import("youtube-transcript");
    _ytInstance = (mod.YoutubeTranscript ?? mod.default?.YoutubeTranscript) as YTInstance;
  }
  return _ytInstance;
}

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
  "sourceTitle": "콘텐츠 제목"
}

=== 신뢰도 점수(credibilityScore) 산출 방법 ===
ROC 가중치법을 사용합니다. 아래 6개 기준을 각각 평가한 뒤 가중합산하여 0~100 정수로 반환하세요.

[각 기준 점수 계산법]
각 기준에는 5개의 부정 지표가 있습니다. 해당 지표가 TRUE(해당됨)이면 해당 점수를 차감하고, 기준별 최솟값은 5점입니다.
기준별 점수 = max(5, 100 - 해당되는 부정지표 점수의 합)
최종 credibilityScore = round(점수1×0.408 + 점수2×0.242 + 점수3×0.158 + 점수4×0.103 + 점수5×0.061 + 점수6×0.027)

[기준 1] 출처 권위도 (가중치 0.408)
- (30점 차감) 실명·법인명·사업자 등 법적 책임 주체를 전혀 확인할 수 없는 완전 익명인가?
- (25점 차감) 해당 분야 전문 자격(애널리스트, FP 등)이나 공인 기관 인증 마크가 없는가?
- (20점 차감) 채널·계정 생성 6개월 미만인가?
- (15점 차감) 과거 허위사실 유포·오보로 신고/경고 기록이 있는가?
- (5점 차감) 제도권 검토를 거친 조직의 목소리가 아닌 개인의 주관적 의견인가?

[기준 2] 시점 유효성 (가중치 0.242)
- (30점 차감) 정보 발생 후 거래량 200% 이상 폭증하며 주가가 이미 고점에 도달했는가?
- (25점 차감) 다루는 핵심 일정(청약일·실적발표·공시 기한 등)이 이미 종료되었는가?
- (20점 차감) 정보 최초 생성 시각으로부터 6시간 이상 경과했는가?
- (15점 차감) 12시간 이전에 배포된 뉴스를 재가공한 내용인가?
- (5점 차감) 작성일·수정일 등 시각 데이터가 본문에 없는가?

[기준 3] 논리적 완결성 (가중치 0.158)
- (30점 차감) 원인·결과 간 상관관계 없거나 중간 설명이 생략된 논리적 비약이 있는가?
- (25점 차감) "무조건", "확정" 등 투자 결과를 장담하는 단정적 선동이 있는가?
- (20점 차감) 이미 변동된 주가 결과를 끼워 맞추는 사후 확신인가?
- (15점 차감) 하락 가능성이나 변수에 대한 언급이 전혀 없는가?
- (5점 차감) 오직 한 가지 이유만으로 전체 시장을 판단하려 하는가?

[기준 4] 이해관계 투명성 (가중치 0.103)
- (30점 차감) 유료 리딩방·개인 톡방 가입 유도 등 폐쇄적 공간으로 유인하는가?
- (25점 차감) 종목 보유 여부 미표기, 광고·협찬을 숨기고 중립적인 척 전달하는가?
- (20점 차감) "좋아요 100개 넘으면 공개" 등 반응을 볼모로 정보를 감추는가?
- (15점 차감) 기업 리스크를 배제하고 장점만 나열하는 홍보성 자료를 그대로 복사했는가?
- (5점 차감) 인기 종목 해시태그 남발, 팔로우 시에만 정보 공개 등 계정 성장용 낚시인가?

[기준 5] 데이터 구체성 (가중치 0.061)
- (30점 차감) 종목 현재가·목표주가·상승률·실적 등 수치 데이터가 하나도 없는가?
- (25점 차감) 주가 차트·재무제표·공식 보도자료 등 시각적 증거가 전혀 없는가?
- (20점 차감) 경쟁사나 시장 지수(코스피/코스닥)와 비교한 수치가 전혀 없는가?
- (15점 차감) 기자 이름 없거나 데이터 출처 언급이 본문에 없는가?
- (5점 차감) 분석 없이 단순 사실만 1~2줄 나열한 단순 공유 형태인가?

[기준 6] 교차 검증 일치도 (가중치 0.027)
- (30점 차감) 출처 근거의 신뢰도 판정에 상충하는 요소가 있는가?
- (25점 차감) 본문 수치와 외부 알려진 팩트 간 불일치가 있는가?
- (20점 차감) 인과관계 비약이나 선동 표현의 심각성이 모호한가?
- (15점 차감) 정보의 유효 기간이나 시세 선반영 수준 판단이 불명확한가?
- (5점 차감) 작성자의 숨겨진 이득 여부 판단이 불명확한가?

=== 기타 규칙 ===
- summary는 반드시 3개, 각각 한국어로 50자 내외
- sentiment 판단 기준:
  positive: 실적 개선, 수주·계약 체결, 목표주가 상향, 업황 회복, 정책 수혜, 신사업 모멘텀 등 투자에 긍정적인 신호
  neutral: 단순 사실 전달, 긍정·부정 신호 혼재, 방향성 불명확, 현상 유지 의견
  negative: 실적 부진·적자 전환, 목표주가 하향, 규제 리스크, 경쟁 심화, 대규모 손실·소송 등 투자에 부정적인 신호
- recommendedStocks: 콘텐츠와 관련된 종목 정확히 3개. 국내 종목(KRX) 2개 + 해외 종목(US) 1개 조합을 기본으로 하되, 콘텐츠가 해외 전용이면 해외 2개 + 국내 1개도 허용. 관련 종목이 없으면 빈 배열
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
      temperature: 0,
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
      const yt = await getYoutubeTranscript();
      const transcript = await yt.fetchTranscript(videoId, { lang: "ko" });
      transcriptText = transcript.map((t) => t.text).join(" ").slice(0, 4000);
    } catch {
      try {
        const yt = await getYoutubeTranscript();
        const transcript = await yt.fetchTranscript(videoId);
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
      temperature: 0,
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
      temperature: 0,
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
