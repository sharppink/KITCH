import { Router } from "express";
import OpenAI from "openai";
import * as cheerio from "cheerio";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { fileURLToPath } from "url";

const execFileAsync = promisify(execFile);
const _dirname = path.dirname(fileURLToPath(import.meta.url));
const YT_DLP_PATH = path.resolve(_dirname, "../../yt-dlp");
const NODE_PATH = process.execPath;

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

// yt-dlp로 YouTube 영상 정보(제목·설명·채널) + 자동생성 자막 추출
async function fetchYouTubeInfoViaYtDlp(videoId: string): Promise<{
  title: string;
  description: string;
  channelName: string;
  autoSubtitle: string;
}> {
  const result = { title: "유튜브 영상", description: "", channelName: "", autoSubtitle: "" };

  // 1. --dump-json으로 영상 메타데이터 가져오기
  try {
    const { stdout } = await execFileAsync(
      YT_DLP_PATH,
      [
        "--dump-json",
        "--no-playlist",
        `--js-runtimes`, `node:${NODE_PATH}`,
        "--quiet",
        `https://www.youtube.com/watch?v=${videoId}`,
      ],
      { timeout: 20000 }
    );
    const data = JSON.parse(stdout);
    result.title = data.title || result.title;
    result.channelName = data.uploader || data.channel || "";
    result.description = (data.description || "").slice(0, 3000);

    // 2. 자동 생성 자막이 있으면 가져오기 (subtitle URL에서 직접)
    const autoSubs = data.automatic_captions;
    const manualSubs = data.subtitles;
    const subLangs = ["ko", "en"];

    for (const lang of subLangs) {
      const subList = (autoSubs?.[lang] || autoSubs?.[`${lang}-KR`] ||
                       manualSubs?.[lang] || manualSubs?.[`${lang}-KR`]) as any[] | undefined;
      if (subList && subList.length > 0) {
        // json3 또는 vtt 형식 우선
        const jsonSub = subList.find((s: any) => s.ext === "json3") || subList[0];
        if (jsonSub?.url) {
          try {
            const subRes = await fetch(jsonSub.url, { signal: AbortSignal.timeout(10000) });
            const subData = await subRes.json() as any;
            // json3 형식: events[].segs[].utf8
            if (subData?.events) {
              const text = subData.events
                .flatMap((e: any) => (e.segs || []).map((s: any) => s.utf8 || ""))
                .join(" ")
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 4000);
              if (text.length > 50) {
                result.autoSubtitle = text;
                break;
              }
            }
          } catch {}
        }
      }
    }
  } catch {}

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
    let transcriptText = "";
    let videoTitle = "유튜브 영상";
    let channelName = "";
    let videoDescription = "";

    // 1. yt-dlp로 영상 정보 + 자동생성 자막 동시에 가져오기
    const [ytDlpInfo] = await Promise.all([
      fetchYouTubeInfoViaYtDlp(videoId),
    ]);
    videoTitle = ytDlpInfo.title;
    channelName = ytDlpInfo.channelName;
    videoDescription = ytDlpInfo.description;

    // 2. youtube-transcript 라이브러리로 수동 자막 시도 (한국어 → 전 언어 순)
    try {
      const yt = await getYoutubeTranscript();
      const transcript = await yt.fetchTranscript(videoId, { lang: "ko" });
      transcriptText = transcript.map((t) => t.text).join(" ").slice(0, 4000);
    } catch {
      try {
        const yt = await getYoutubeTranscript();
        const transcript = await yt.fetchTranscript(videoId);
        transcriptText = transcript.map((t) => t.text).join(" ").slice(0, 4000);
      } catch {}
    }

    // 3. 수동 자막 없으면 yt-dlp 자동 생성 자막 사용
    if (transcriptText.length < 50 && ytDlpInfo.autoSubtitle.length > 50) {
      transcriptText = ytDlpInfo.autoSubtitle;
    }

    // 4. 분석에 사용할 콘텐츠 조합
    //    우선순위: 자막 > 자동자막 > 영상 설명 > 제목만
    const hasTranscript = transcriptText.length > 50;
    const contentForAnalysis = hasTranscript
      ? `[자막/자동자막]\n${transcriptText}${videoDescription ? `\n\n[영상 설명]\n${videoDescription}` : ""}`
      : videoDescription.length > 50
        ? `[자막 없음 — 영상 설명으로 분석]\n${videoDescription}`
        : "(자막 및 영상 설명 모두 없음 — 제목과 URL만으로 분석)";

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      temperature: 0,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `다음 유튜브 투자 영상을 분석해주세요.\n\n제목: ${videoTitle}\n채널: ${channelName || "알 수 없음"}\nURL: ${url}\n\n${contentForAnalysis}`,
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
