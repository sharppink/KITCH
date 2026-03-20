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
  "sectorKeywords": "뉴스 검색에 사용할 한국어 키워드 공백 구분 1~3개",
  "sourceTitle": "콘텐츠 제목"
}

=== 신뢰도 점수(credibilityScore) 산출 방법 ===
ROC 가중치법을 사용합니다. 아래 6개 기준을 각각 평가한 뒤 가중합산하여 0~100 정수로 반환하세요.

[각 기준 점수 계산법]
각 기준에는 5개의 부정 지표가 있습니다. 해당 지표가 TRUE(해당됨)이면 해당 점수를 차감하고, 기준별 최솟값은 0점입니다.
기준별 점수 = max(0, 100 - 해당되는 부정지표 점수의 합)
최종 credibilityScore = round(점수1×0.408 + 점수2×0.242 + 점수3×0.158 + 점수4×0.103 + 점수5×0.061 + 점수6×0.027)

[기준 1] 출처 권위도 (가중치 0.408)
- (30점 차감) 실명·법인명·사업자 등 법적 책임 주체를 전혀 확인할 수 없는 완전 익명인가?
- (25점 차감) 해당 분야 전문 자격(애널리스트, FP 등)이나 공인 기관 인증 마크가 없는가?
- (20점 차감) 채널·계정 생성 6개월 미만인가?
- (15점 차감) 과거 허위사실 유포·오보로 신고/경고 기록이 있는가?
- (10점 차감) 제도권 검토를 거친 조직의 목소리가 아닌 개인의 주관적 의견인가?

[기준 2] 시점 유효성 (가중치 0.242)
- (30점 차감) 정보 발생 후 거래량 200% 이상 폭증하며 주가가 이미 고점에 도달했는가?
- (25점 차감) 다루는 핵심 일정(청약일·실적발표·공시 기한 등)이 이미 종료되었는가?
- (20점 차감) 정보 최초 생성 시각으로부터 6시간 이상 경과했는가?
- (15점 차감) 12시간 이전에 배포된 뉴스를 재가공한 내용인가?
- (10점 차감) 작성일·수정일 등 시각 데이터가 본문에 없는가?

[기준 3] 논리적 완결성 (가중치 0.158)
- (30점 차감) 원인·결과 간 상관관계 없거나 중간 설명이 생략된 논리적 비약이 있는가?
- (25점 차감) "무조건", "확정" 등 투자 결과를 장담하는 단정적 선동이 있는가?
- (20점 차감) 이미 변동된 주가 결과를 끼워 맞추는 사후 확신인가?
- (15점 차감) 하락 가능성이나 변수에 대한 언급이 전혀 없는가?
- (10점 차감) 오직 한 가지 이유만으로 전체 시장을 판단하려 하는가?

[기준 4] 이해관계 투명성 (가중치 0.103)
- (30점 차감) 유료 리딩방·개인 톡방 가입 유도 등 폐쇄적 공간으로 유인하는가?
- (25점 차감) 종목 보유 여부 미표기, 광고·협찬을 숨기고 중립적인 척 전달하는가?
- (20점 차감) "좋아요 100개 넘으면 공개" 등 반응을 볼모로 정보를 감추는가?
- (15점 차감) 기업 리스크를 배제하고 장점만 나열하는 홍보성 자료를 그대로 복사했는가?
- (10점 차감) 인기 종목 해시태그 남발, 팔로우 시에만 정보 공개 등 계정 성장용 낚시인가?

[기준 5] 데이터 구체성 (가중치 0.061)
- (30점 차감) 종목 현재가·목표주가·상승률·실적 등 수치 데이터가 하나도 없는가?
- (25점 차감) 주가 차트·재무제표·공식 보도자료 등 시각적 증거가 전혀 없는가?
- (20점 차감) 경쟁사나 시장 지수(코스피/코스닥)와 비교한 수치가 전혀 없는가?
- (15점 차감) 기자 이름 없거나 데이터 출처 언급이 본문에 없는가?
- (10점 차감) 분석 없이 단순 사실만 1~2줄 나열한 단순 공유 형태인가?

[기준 6] 교차 검증 일치도 (가중치 0.027)
- (30점 차감) 출처 근거의 신뢰도 판정에 상충하는 요소가 있는가?
- (25점 차감) 본문 수치와 외부 알려진 팩트 간 불일치가 있는가?
- (20점 차감) 인과관계 비약이나 선동 표현의 심각성이 모호한가?
- (15점 차감) [신선도 및 기한 합의 불가] RAG를 통해 추출된 해당 정보의 최초 발생 시점과 현재 에이전트가 참조하는 최근 데이터 간에 유의미한 시차가 존재하여, 정보의 유효성(이미 반영된 호재/악재 여부)에 대해 에이전트 간 결론이 대립하는가?
- (10점 차감) [외부 경로 유도 및 형식적 결함] 본문 내에 시스템이 추적할 수 없는 외부 연결망(오픈채팅, 텔레그램, 개인 톡방 등)의 URL이나 ID가 포함되어 있는가? 또는 텍스트 내 이모지 및 특수문자의 비중이 전체 글자 수의 10%를 초과하는 등 일반적인 정보 전달 형식(금융 리포트·뉴스 기사 등의 평균 3~5% 대비)을 벗어나는가?

=== 기타 규칙 ===
- summary는 반드시 3개, 각각 한국어로 50자 내외
- sentiment 판단 기준:
  positive: 실적 개선, 수주·계약 체결, 목표주가 상향, 업황 회복, 정책 수혜, 신사업 모멘텀 등 투자에 긍정적인 신호
  neutral: 단순 사실 전달, 긍정·부정 신호 혼재, 방향성 불명확, 현상 유지 의견
  negative: 실적 부진·적자 전환, 목표주가 하향, 규제 리스크, 경쟁 심화, 대규모 손실·소송 등 투자에 부정적인 신호
- recommendedStocks: 콘텐츠와 직접·간접으로 관련된 종목을 1~3개 선정. 억지로 3개를 채우지 말 것 — 관련성이 명확한 종목만 포함하고, 관련 종목이 없으면 빈 배열 반환.
  [선정 우선순위]
  1순위: 콘텐츠 본문·자막에 실명 언급된 종목 (무조건 포함)
  2순위: 해당 산업/테마의 시가총액 상위 대표주
  3순위: 관련 공급망·경쟁사·수혜 섹터 종목
  [관련도(relevance) 판단 기준]
  high — 콘텐츠에 직접 언급되거나 핵심 테마의 시총 1~2위 종목
  medium — 직접 언급 없지만 동일 공급망·경쟁사·직접 수혜 관계인 종목
  low — 섹터 유사성 또는 매크로 환경 연관성만 있는 간접 관련 종목
  [국내/해외 비율] 국내(KRX) 2개 + 해외(US) 1개 조합을 기본으로 하되, 콘텐츠가 해외 전용이면 해외 2개 + 국내 1개도 허용. 단, 관련성 기준을 충족하는 종목이 부족하면 비율 조건보다 품질 우선
- sectorTags: 2~3개의 한국어 섹터·테마 태그. 예: "반도체", "2차전지", "AI/데이터센터", "바이오", "금융", "부동산", "원자재", "ETF", "금리", "환율", "방산", "전력/에너지", "소비재" 등
- sectorKeywords: 관련 뉴스 검색에 쓸 핵심 한국어 키워드 1~3개를 공백으로 구분. 예: "삼성전자 반도체 HBM", "테슬라 전기차", "코스피 금리"
- JSON만 응답, 다른 텍스트 금지`;

function extractTweetId(url: string): string | null {
  const match = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
  return match ? match[1] : null;
}

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    // youtube.com/watch?v=... (v= may appear after other params like si=)
    if (u.hostname.includes('youtube.com') && u.pathname === '/watch') {
      const v = u.searchParams.get('v');
      if (v) return v;
    }
    // youtu.be/<id>
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0];
      if (id) return id;
    }
    // youtube.com/shorts/<id> or youtube.com/embed/<id>
    const shortMatch = u.pathname.match(/\/(?:shorts|embed)\/([^/?#]+)/);
    if (shortMatch) return shortMatch[1];
  } catch {}
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

    // 3. 지역 제한 영상은 즉시 분석 불가 반환
    if (ytInfo.geoBlocked) {
      console.log(`[YouTube] 지역 제한 영상 (${videoId})`);
      res.json({
        contentType: "youtube",
        cannotAnalyze: true,
        geoBlocked: true,
        sourceTitle: displayTitle,
        channelName,
        analyzedAt: new Date().toISOString(),
      });
      return;
    }

    // 4. 분석에 사용할 콘텐츠 조합: 자막 > 영상 설명 > 제목만 (최후 수단)
    const hasTranscript = transcriptText.length > 50;
    const hasDescription = videoDescription.length > 50;
    let contentForAnalysis: string;

    if (hasTranscript) {
      contentForAnalysis = `[자막/자동자막]\n${transcriptText}${videoDescription ? `\n\n[영상 설명]\n${videoDescription}` : ""}`;
    } else if (hasDescription) {
      contentForAnalysis = `[자막 없음 — 영상 설명으로 분석]\n${videoDescription}`;
    } else {
      // 자막·설명 모두 없어도 제목이 있으면 GPT로 분석 시도
      // (뉴스 제목은 대부분 충분한 정보를 포함함)
      if (!displayTitle || displayTitle === "유튜브 영상") {
        console.log(`[YouTube] 분석 불가 — 제목·자막·설명 모두 없음 (${videoId})`);
        res.json({
          contentType: "youtube",
          cannotAnalyze: true,
          geoBlocked: false,
          sourceTitle: displayTitle,
          channelName,
          analyzedAt: new Date().toISOString(),
        });
        return;
      }
      console.log(`[YouTube] 제목만으로 분석 시도 (${videoId}): ${displayTitle}`);
      contentForAnalysis = `[자막·설명 불러오기 실패 — 제목 기반 분석]\n제목에서 파악 가능한 투자 정보를 최대한 분석하세요. 정보가 제한적임을 요약에 반영하세요.`;
    }

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

// POST /api/analyze/twitter
router.post("/twitter", async (req, res) => {
  const { url } = req.body as { url?: string };
  if (!url) {
    res.status(400).json({ error: "url이 필요합니다" });
    return;
  }

  const tweetId = extractTweetId(url);
  if (!tweetId) {
    res.status(400).json({ error: "유효한 트위터/X URL이 아닙니다 (예: https://x.com/user/status/123)" });
    return;
  }

  try {
    // Twitter oEmbed API (공개 트윗, 무료)
    const oembedRes = await fetch(
      `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!oembedRes.ok) {
      res.status(400).json({ error: "트윗을 가져올 수 없습니다. 비공개 계정이거나 삭제된 트윗일 수 있어요." });
      return;
    }

    const oembed = await oembedRes.json() as { html?: string; author_name?: string };
    const $ = cheerio.load(oembed.html || "");

    // blockquote 내 p 태그 텍스트 = 트윗 본문
    const tweetText = $("blockquote > p").first().text().replace(/\s+/g, " ").trim();
    const authorName = oembed.author_name || "알 수 없음";

    if (!tweetText || tweetText.length < 5) {
      res.status(400).json({ error: "트윗 내용을 추출할 수 없습니다." });
      return;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      temperature: 0,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `다음 트위터(X) 게시물을 투자 관점에서 분석해주세요.\n\n작성자: ${authorName}\nURL: ${url}\n\n트윗 내용:\n${tweetText}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = extractJSON(raw);

    res.json({
      ...parsed,
      contentType: "twitter",
      sourceTitle: parsed.sourceTitle || `@${authorName}의 트윗`,
      analyzedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("트위터 분석 오류:", err.message);
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

// GET /api/analyze/sector/news?q=삼성전자+반도체
router.get("/sector/news", async (req, res) => {
  const { q } = req.query as { q?: string };
  if (!q?.trim()) {
    res.status(400).json({ error: "q 파라미터가 필요합니다" });
    return;
  }

  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q.trim())}&hl=ko&gl=KR&ceid=KR:ko`;
    const response = await fetch(rssUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "application/rss+xml, application/xml, text/xml",
      },
      signal: AbortSignal.timeout(8000),
    });

    const xml = await response.text();

    // 간단 RSS 파싱 (regex 기반 — cheerio xmlMode의 link 파싱 한계 우회)
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const titleRegex = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/;
    const linkRegex = /<link>([\s\S]*?)<\/link>/;
    const pubDateRegex = /<pubDate>([\s\S]*?)<\/pubDate>/;
    const sourceRegex = /<source[^>]*>([\s\S]*?)<\/source>/;

    const news: { title: string; source: string; url: string; publishedAt: string }[] = [];
    let m: RegExpExecArray | null;

    while ((m = itemRegex.exec(xml)) !== null && news.length < 5) {
      const block = m[1];
      const rawTitle = block.match(titleRegex)?.[1]?.trim() ?? "";
      const url = block.match(linkRegex)?.[1]?.trim() ?? "";
      const pubDate = block.match(pubDateRegex)?.[1]?.trim() ?? "";
      const source = block.match(sourceRegex)?.[1]?.trim() ??
        rawTitle.match(/\s-\s([^-]+)$/)?.[1]?.trim() ?? "";
      const title = rawTitle.replace(/\s-\s[^-]+$/, "").trim();

      if (title) {
        news.push({
          title,
          source,
          url,
          publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        });
      }
    }

    res.json({ news });
  } catch (e: any) {
    console.error("뉴스 RSS 오류:", e.message?.slice(0, 80));
    res.status(500).json({ error: "뉴스를 가져올 수 없습니다" });
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
      const rawPrice = meta.regularMarketPrice ?? meta.previousClose;
      const rawPrev = meta.chartPreviousClose ?? meta.previousClose ?? rawPrice;

      // 유효한 숫자가 아니면 다음 후보로
      if (rawPrice == null || isNaN(rawPrice)) continue;

      const price = rawPrice as number;
      const prevClose = (rawPrev != null && !isNaN(rawPrev) ? rawPrev : price) as number;
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
