import { Router } from "express";
import OpenAI from "openai";
import * as cheerio from "cheerio";

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
  "detailedSummary": "콘텐츠의 핵심 내용을 투자 관점에서 심층 분석한 3~5문단 텍스트. 각 문단은 주요 논점·수치·리스크·기회 요인을 구체적으로 서술. 총 300~600자 한국어.",
  "credibilityScore": 숫자(0-100),
  "sentiment": "positive" | "neutral" | "negative",
  "recommendedStocks": [
    {"ticker": "티커", "company": "회사명(한국어)", "relevance": "high" | "medium" | "low"}
  ],
  "sectorTags": ["섹터명1", "섹터명2"],
  "marketContext": "이 콘텐츠와 관련된 시장 배경·섹터 이슈·투자 테마를 투자자 관점에서 2~3문장으로 한국어 서술",
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
- sectorTags: 2~3개의 한국어 섹터·테마 태그. 예: "반도체", "2차전지", "AI/데이터센터", "바이오", "금융", "부동산", "원자재", "ETF", "금리", "환율", "방산", "전력/에너지", "소비재" 등
- marketContext: 50~150자. 콘텐츠 관련 시장 배경·섹터 흐름·주목 이슈를 투자자 관점에서 서술
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

// 네이버 블로그에서 blogId / logNo 추출 (모든 URL 형식 지원)
function extractNaverBlogIds(url: string): { blogId: string; logNo: string } | null {
  // 형식 1: blog.naver.com/blogId/logNo 또는 m.blog.naver.com/blogId/logNo
  const pathMatch = url.match(/blog\.naver\.com\/([^/?#]+)\/(\d+)/);
  if (pathMatch) return { blogId: pathMatch[1], logNo: pathMatch[2] };

  // 형식 2: PostView.naver?blogId=X&logNo=Y (쿼리파라미터 방식)
  try {
    const u = new URL(url);
    const blogId = u.searchParams.get("blogId");
    const logNo = u.searchParams.get("logNo");
    if (blogId && logNo) return { blogId, logNo };
  } catch {}

  return null;
}

function naverBlogMobileUrl(url: string): string | null {
  const ids = extractNaverBlogIds(url);
  if (ids) return `https://m.blog.naver.com/${ids.blogId}/${ids.logNo}`;
  return null;
}

function naverBlogPostViewUrl(url: string): string | null {
  const ids = extractNaverBlogIds(url);
  if (ids) return `https://blog.naver.com/PostView.naver?blogId=${ids.blogId}&logNo=${ids.logNo}&redirect=Dlog&widgetTypeCall=true&directAccess=true`;
  return null;
}

async function fetchHtml(fetchUrl: string): Promise<string> {
  const response = await fetch(fetchUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ko-KR,ko;q=0.9",
      "Referer": "https://www.naver.com/",
    },
    signal: AbortSignal.timeout(10000),
  });
  return response.text();
}

function extractNaverBlogText($: ReturnType<typeof cheerio.load>): string {
  // 네이버 블로그 전용 셀렉터 (신/구 에디터 모두 대응)
  const selectors = [
    ".se-main-container",
    ".post-content",
    "#postViewArea",
    ".se_component_wrap",
    ".blog_content",
    "#content",
    ".entry-content",
  ];
  for (const sel of selectors) {
    const text = $(sel).text().trim();
    if (text.length > 100) return text;
  }
  return "";
}

// MSN 기사 ID 추출 및 내부 API로 본문 가져오기
function extractMsnArticleId(url: string): string | null {
  // ar-XXXXXXX 패턴만 뽑음 (URL 경로 어디에 있든)
  const m = url.match(/\/ar-([A-Za-z0-9]+)/);
  return m ? m[1] : null;
}

async function fetchMsnArticle(url: string): Promise<{ title: string; text: string } | null> {
  const articleId = extractMsnArticleId(url);
  if (!articleId) return null;

  // locale 추출 (ko-kr, en-us 등)
  const localeMatch = url.match(/msn\.com\/([a-z]{2}-[a-z]{2})\//);
  const locale = localeMatch ? localeMatch[1] : "ko-kr";

  try {
    const apiUrl = `https://assets.msn.com/content/view/v2/Detail/${locale}/${articleId}`;
    const res = await fetch(apiUrl, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json() as any;

    const title: string = data.title || "";
    const bodyHtml: string = data.body || data.text || "";

    // HTML 태그 제거해서 텍스트만 추출
    const $ = cheerio.load(bodyHtml);
    const text = $("body").text().replace(/\s+/g, " ").trim().slice(0, 4000);

    return { title, text };
  } catch {
    return null;
  }
}

// POST /api/analyze/news
router.post("/news", async (req, res) => {
  const { url } = req.body as { url?: string };
  if (!url) {
    res.status(400).json({ error: "url이 필요합니다" });
    return;
  }

  try {
    const isNaverBlog = /blog\.naver\.com/.test(url);
    const isMsn = /msn\.com/.test(url);
    let html = "";
    let extractedText = "";

    if (isMsn) {
      // MSN: 내부 API로 본문 직접 추출
      const msnData = await fetchMsnArticle(url);
      if (msnData) {
        extractedText = msnData.text;
        html = `<html><head><title>${msnData.title}</title></head><body></body></html>`;
      }
    } else if (isNaverBlog) {
      // 1차: 모바일 URL 시도
      try {
        const mobileUrl = naverBlogMobileUrl(url);
        if (mobileUrl) {
          html = await fetchHtml(mobileUrl);
          const $ = cheerio.load(html);
          $("script, style, nav, footer, header, aside").remove();
          extractedText = extractNaverBlogText($);
        }
      } catch {}

      // 2차: PostView URL 시도 (iframe 직접 접근)
      if (!extractedText || extractedText.length < 100) {
        try {
          const pvUrl = naverBlogPostViewUrl(url);
          if (pvUrl) {
            html = await fetchHtml(pvUrl);
            const $ = cheerio.load(html);
            $("script, style, nav, footer, header, aside").remove();
            extractedText = extractNaverBlogText($);
            if (!extractedText) extractedText = $("body").text();
          }
        } catch {}
      }
    } else {
      html = await fetchHtml(url);
    }

    const $ = cheerio.load(html);
    $("script, style, nav, footer, header, aside, .ad, .advertisement").remove();

    const title = $("title").text().trim() ||
      $("h1").first().text().trim() ||
      "기사";

    // 본문 추출 (네이버 블로그면 이미 추출됨)
    if (!extractedText) {
      extractedText =
        $("article").text() ||
        $("main").text() ||
        $(".article-body, .article-content, .news-content, #articleBody").text() ||
        $("body").text();
    }

    const cleanText = extractedText
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

// YouTube InnerTube API로 영상 정보 + 자막 가져오기
// - ytdl-core, youtube-transcript 대체 (봇 차단 없음, 지역 제한 제외)
const INNERTUBE_URL = "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";
const INNERTUBE_CLIENT = {
  clientName: "ANDROID",
  clientVersion: "20.10.38",
};
const INNERTUBE_UA = `com.google.android.youtube/${INNERTUBE_CLIENT.clientVersion} (Linux; U; Android 14)`;

async function fetchYouTubeViaInnerTube(videoId: string): Promise<{
  title: string;
  description: string;
  channelName: string;
  transcript: string;
  geoBlocked: boolean;
}> {
  const result = { title: "", description: "", channelName: "", transcript: "", geoBlocked: false };

  try {
    const res = await fetch(INNERTUBE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": INNERTUBE_UA,
      },
      body: JSON.stringify({
        context: { client: INNERTUBE_CLIENT },
        videoId,
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) return result;
    const data = await res.json() as any;

    const ps = data.playabilityStatus?.status;
    // 지역 제한 또는 이용 불가
    if (ps === "ERROR" || ps === "LOGIN_REQUIRED") {
      if (data.playabilityStatus?.reason?.includes("unavailable") ||
          data.playabilityStatus?.reason?.includes("country")) {
        result.geoBlocked = true;
      }
      // 제목은 oEmbed로 가져오도록 빈 채로 반환
      return result;
    }

    const vd = data.videoDetails || {};
    result.title = vd.title || "";
    result.channelName = vd.author || "";
    result.description = (vd.shortDescription || "").slice(0, 3000);

    // 자막 트랙 가져오기
    const captionTracks: any[] =
      data.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];

    const track =
      captionTracks.find((t: any) => t.languageCode?.startsWith("ko")) ||
      captionTracks.find((t: any) => !t.kind || t.kind !== "asr") || // 수동 자막 우선
      captionTracks[0];

    if (track?.baseUrl) {
      try {
        const subRes = await fetch(track.baseUrl + "&fmt=json3", {
          signal: AbortSignal.timeout(8000),
        });
        const subData = await subRes.json() as any;
        if (subData?.events) {
          const text = subData.events
            .flatMap((e: any) => (e.segs || []).map((s: any) => s.utf8 || ""))
            .join(" ")
            .replace(/[\u200B\u200C\u200D\uFEFF]/g, "") // 제로폭 문자 제거
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 4000);
          if (text.length > 50) result.transcript = text;
        }
      } catch {}
    }
  } catch (e: any) {
    console.error("InnerTube 오류:", e.message?.slice(0, 100));
  }

  return result;
}

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
    // 1. InnerTube API로 영상 정보 + 자막 가져오기 (봇 차단 없음)
    const ytInfo = await fetchYouTubeViaInnerTube(videoId);

    let videoTitle = ytInfo.title;
    let channelName = ytInfo.channelName;
    let videoDescription = ytInfo.description;
    let transcriptText = ytInfo.transcript;

    // 2. 제목·채널이 없으면 oEmbed로 보완 (지역 제한 영상에서도 항상 작동)
    if (!videoTitle) {
      try {
        const oembedRes = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
          { signal: AbortSignal.timeout(5000) }
        );
        const oembed = await oembedRes.json() as { title?: string; author_name?: string };
        videoTitle = oembed.title || "";
        channelName = channelName || oembed.author_name || "";
      } catch {}
    }

    const displayTitle = videoTitle || "유튜브 영상";

    // 3. 분석할 콘텐츠가 전혀 없으면 → 분석 불가 즉시 반환 (GPT 호출 안 함)
    const hasContent = transcriptText.length > 50 || videoDescription.length > 50;
    if (!hasContent) {
      const reason = ytInfo.geoBlocked
        ? "지역 제한으로 서버에서 영상에 접근할 수 없습니다."
        : "자막 및 영상 설명을 가져올 수 없습니다.";
      console.log(`[YouTube] 분석 불가 (${videoId}): ${reason}`);
      res.json({
        contentType: "youtube",
        cannotAnalyze: true,
        geoBlocked: ytInfo.geoBlocked,
        sourceTitle: displayTitle,
        channelName,
        analyzedAt: new Date().toISOString(),
      });
      return;
    }

    // 4. 분석에 사용할 콘텐츠 조합: 자막 > 영상 설명
    const hasTranscript = transcriptText.length > 50;
    const contentForAnalysis = hasTranscript
      ? `[자막/자동자막]\n${transcriptText}${videoDescription ? `\n\n[영상 설명]\n${videoDescription}` : ""}`
      : `[자막 없음 — 영상 설명으로 분석]\n${videoDescription}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      temperature: 0,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `다음 유튜브 투자 영상을 분석해주세요.\n\n제목: ${displayTitle}\n채널: ${channelName || "알 수 없음"}\nURL: ${url}\n\n${contentForAnalysis}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = extractJSON(raw);

    res.json({
      ...parsed,
      contentType: "youtube",
      sourceTitle: parsed.sourceTitle || displayTitle,
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

// GET /api/analyze/stock/price?ticker=005930
router.get("/stock/price", async (req, res) => {
  const { ticker } = req.query as { ticker?: string };
  if (!ticker?.trim()) {
    res.status(400).json({ error: "ticker가 필요합니다" });
    return;
  }

  const t = ticker.trim();
  const isKorean = /^\d{6}$/.test(t);
  const candidates = isKorean ? [`${t}.KS`, `${t}.KQ`] : [t];

  for (const yt of candidates) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yt)}?interval=1d&range=1d`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) continue;
      const data = await response.json() as any;
      const result = data.chart?.result?.[0];
      if (!result?.meta) continue;

      const meta = result.meta;
      const price: number = meta.regularMarketPrice ?? meta.previousClose;
      const prevClose: number = meta.chartPreviousClose ?? meta.previousClose ?? price;
      const change = price - prevClose;
      const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;

      res.json({
        ticker: yt,
        price: Math.round(price * 100) / 100,
        prevClose: Math.round(prevClose * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        currency: meta.currency || "KRW",
        marketState: meta.marketState || "CLOSED",
        shortName: meta.shortName || meta.longName || "",
        exchangeName: meta.fullExchangeName || meta.exchangeName || "",
      });
      return;
    } catch (e: any) {
      console.error(`Stock price error for ${yt}:`, e.message?.slice(0, 80));
    }
  }

  res.status(404).json({ error: "시세를 가져올 수 없습니다. 잠시 후 다시 시도해주세요." });
});

export default router;
