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

let openaiSingleton: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiSingleton) {
    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error(
        "AI_INTEGRATIONS_OPENAI_API_KEY is not set. Configure it in Vercel Environment Variables.",
      );
    }
    openaiSingleton = new OpenAI({
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      apiKey,
    });
  }
  return openaiSingleton;
}

const SYSTEM_PROMPT = `당신은 투자 분석 AI입니다. 주어진 콘텐츠를 분석하여 다음 JSON 형식으로 정확히 응답하세요:
{
  "summary": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"],
  "detailedSummary": "콘텐츠의 핵심 내용을 투자 관점에서 심층 분석한 3~5문단 텍스트. 각 문단은 주요 논점·수치·리스크·기회 요인을 구체적으로 서술. 총 300~600자 한국어.",
  "isInvestmentContent": true 또는 false,
  "credibilityScore": 숫자(0-100),
  "criteriaScores": [기준1점수, 기준2점수, 기준3점수, 기준4점수, 기준5점수, 기준6점수],
  "sentiment": "positive" | "neutral" | "negative",
  "recommendedStocks": [
    {"ticker": "티커", "company": "회사명(한국어)", "relevance": "high" | "medium" | "low"}
  ],
  "sectorTags": ["섹터명1", "섹터명2"],
  "sectorKeywords": "뉴스 검색에 사용할 한국어 키워드 공백 구분 1~3개",
  "sourceTitle": "콘텐츠 제목"
}

isInvestmentContent: 콘텐츠가 주식·채권·ETF·펀드·부동산·원자재·환율·금리·경제지표·기업 실적·산업 동향 등 투자 판단에 활용 가능한 정보를 포함하는 경우 true. 순수 오락·일상·스포츠·요리·게임 등 투자와 무관한 콘텐츠는 false. false인 경우 credibilityScore는 0, criteriaScores는 [0,0,0,0,0,0], recommendedStocks는 []로 반환하라.

=== 신뢰도 점수(credibilityScore 및 criteriaScores) 산출 방법 ===
반드시 아래의 평가 프로세스를 순서대로 수행하라. 절대 직관적으로 점수를 주지 말고, 체크리스트 기반 감점 방식으로 계산하라.

[1단계] 평가 기준 (총 6개)
다음 6개 기준을 각각 100점에서 시작하여 감점 방식으로 평가한다.
① 출처 권위도  ② 데이터 구체성  ③ 논리적 완결성  ④ 시점 유효성  ⑤ 이해관계 투명성  ⑥ 교차검증 일치도

[2단계] 체크리스트 기반 감점
각 기준마다 아래 결함이 존재하는지 판단하고 감점하라. 각 항목은 복수 적용 가능하다.
감점 기준: -30(치명적 결함) / -25(매우 높은 결함) / -20(중대한 결함) / -15(일반 결함) / -10(경미한 결함)

[출처 권위도 체크리스트]
-30: 실명/법인 확인 불가 | -25: 전문성 없음 | -20: 신규 계정 | -15: 허위정보 이력 | -10: 개인 의견 중심

[데이터 구체성 체크리스트]
-30: 핵심 수치 없음 | -25: 시각 자료 없음 | -20: 비교 대상 없음 | -15: 출처 없음 | -10: 분석 없음

[논리적 완결성 체크리스트]
-30: 인과관계 부족 | -25: 단정적 표현 | -20: 사후 해석 | -15: 리스크 미언급 | -10: 단일 근거 일반화

[시점 유효성 체크리스트]
-30: 이미 반영된 정보 | -25: 이벤트 종료 | -20: 오래된 정보 | -15: 과거 재가공 | -10: 작성 시점 불명확

[이해관계 투명성 체크리스트]
-30: 외부 유입 유도 | -25: 이해관계 미공개 | -20: 조건형 콘텐츠 | -15: 일방적 홍보 | -10: 낚시성 콘텐츠

[교차검증 일치도 체크리스트]
-30: 외부 데이터 불일치 | -25: 출처 간 충돌 | -20: 논리 충돌 | -15: 시점 불일치 | -10: 비정상 구조

[3단계] 기준별 점수 계산
각 기준은 100점에서 감점 적용 후 0~100 사이 값으로 산출한다.

[4단계] 가중치 적용 (ROC 방식)
credibilityScore = round(출처 권위도×0.408 + 시점 유효성×0.242 + 논리적 완결성×0.158 + 이해관계 투명성×0.103 + 데이터 구체성×0.061 + 교차검증 일치도×0.028)

[5단계] criteriaScores 배열 출력
criteriaScores는 반드시 아래 순서 그대로 6개 정수 배열로 출력하라:
[출처 권위도 점수, 시점 유효성 점수, 논리적 완결성 점수, 이해관계 투명성 점수, 데이터 구체성 점수, 교차검증 일치도 점수]

=== 기타 규칙 ===
- summary는 반드시 3개, 각각 한국어로 50자 내외
- sentiment 판단 기준 (반드시 아래 우선순위로 적극 판단하라. neutral은 최후 수단이다):
  [positive로 판단] 아래 중 하나라도 해당하면 positive:
    실적 개선·서프라이즈, 수주·계약·MOU 체결, 목표주가 상향, 업황 회복·호전, 정책 수혜·보조금, 신사업·신제품 출시, 주가 상승 전망, 배당 증가, 시장점유율 확대, 긍정적 가이던스
  [negative로 판단] 아래 중 하나라도 해당하면 negative:
    실적 부진·적자·손실, 목표주가 하향, 규제·과징금·소송, 경쟁 심화·점유율 하락, 대규모 리콜·사고, 금리 인상 부담, 공급망 차질, 부정적 가이던스, 임원 사임·횡령 등 리스크
  [neutral 사용 조건] 위 두 조건 모두 해당하지 않고, 긍정·부정 신호가 명확히 동등하게 혼재하거나, 단순 수치 발표(방향성 없음)인 경우에만 neutral. isInvestmentContent가 false이면 반드시 neutral.
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
- sectorKeywords: 구글 뉴스 검색에 바로 입력할 한국어 키워드 1~3개를 공백으로 구분. 반드시 실제 뉴스 기사 제목에 자주 등장하는 단어를 선택하라. 너무 구체적인 복합어보다 단독으로도 검색 가능한 핵심 단어를 우선하라. 예: "삼성전자 반도체", "테슬라 주가", "코스피 금리", "SK하이닉스", "LG에너지솔루션 배터리"
- JSON만 응답, 다른 텍스트 금지`;

// 신뢰도 전용 경량 프롬프트 (5회 평균용)
const CREDIBILITY_ONLY_PROMPT = `당신은 투자 콘텐츠 신뢰도 평가 AI입니다. 주어진 콘텐츠의 신뢰도만 평가하여 다음 JSON 형식으로 정확히 응답하세요:
{
  "isInvestmentContent": true 또는 false,
  "credibilityScore": 숫자(0-100),
  "criteriaScores": [기준1점수, 기준2점수, 기준3점수, 기준4점수, 기준5점수, 기준6점수]
}

isInvestmentContent: 투자 관련 정보 포함 시 true, 아니면 false. false이면 credibilityScore=0, criteriaScores=[0,0,0,0,0,0].

=== 신뢰도 점수 산출 방법 ===
반드시 체크리스트 기반 감점 방식으로 계산하라. 직관적 점수 금지.

[6개 기준] 각각 100점에서 시작하여 감점 적용:
① 출처 권위도  ② 시점 유효성  ③ 논리적 완결성  ④ 이해관계 투명성  ⑤ 데이터 구체성  ⑥ 교차검증 일치도

[감점 기준] -30(치명적) / -25(매우 높음) / -20(중대) / -15(일반) / -10(경미)

[출처 권위도] -30: 실명/법인 확인 불가 | -25: 전문성 없음 | -20: 신규 계정 | -15: 허위정보 이력 | -10: 개인 의견 중심
[시점 유효성] -30: 이미 반영된 정보 | -25: 이벤트 종료 | -20: 오래된 정보 | -15: 과거 재가공 | -10: 작성 시점 불명확
[논리적 완결성] -30: 인과관계 부족 | -25: 단정적 표현 | -20: 사후 해석 | -15: 리스크 미언급 | -10: 단일 근거 일반화
[이해관계 투명성] -30: 외부 유입 유도 | -25: 이해관계 미공개 | -20: 조건형 콘텐츠 | -15: 일방적 홍보 | -10: 낚시성
[데이터 구체성] -30: 핵심 수치 없음 | -25: 시각 자료 없음 | -20: 비교 대상 없음 | -15: 출처 없음 | -10: 분석 없음
[교차검증 일치도] -30: 외부 데이터 불일치 | -25: 출처 간 충돌 | -20: 논리 충돌 | -15: 시점 불일치 | -10: 비정상 구조

criteriaScores 순서: [출처 권위도, 시점 유효성, 논리적 완결성, 이해관계 투명성, 데이터 구체성, 교차검증 일치도]
credibilityScore = round(출처권위도×0.408 + 시점유효성×0.242 + 논리완결성×0.158 + 이해관계×0.103 + 데이터구체성×0.061 + 교차검증×0.028)
JSON만 응답, 다른 텍스트 금지`;

// 신뢰도 N회 병렬 실행
async function runCredibilityRounds(
  userContent: string | object[],
  rounds = 4
): Promise<Array<{ credibilityScore: number; criteriaScores: number[] }>> {
  const calls = Array.from({ length: rounds }, () =>
    getOpenAI().chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 512,
      temperature: 0.5,
      messages: [
        { role: "system", content: CREDIBILITY_ONLY_PROMPT },
        { role: "user", content: userContent as any },
      ],
    }).then(c => {
      const p = extractJSON(c.choices[0]?.message?.content ?? "{}");
      if (typeof p.credibilityScore === "number" && Array.isArray(p.criteriaScores) && p.criteriaScores.length === 6)
        return { credibilityScore: p.credibilityScore, criteriaScores: p.criteriaScores as number[] };
      return null;
    }).catch(() => null)
  );
  const results = await Promise.all(calls);
  return results.filter(Boolean) as Array<{ credibilityScore: number; criteriaScores: number[] }>;
}

// 신뢰도 평균 계산
function averageCredibility(
  main: { credibilityScore: number; criteriaScores: number[] },
  extras: Array<{ credibilityScore: number; criteriaScores: number[] }>
): { credibilityScore: number; criteriaScores: number[] } {
  const all = [main, ...extras].filter(
    r => typeof r.credibilityScore === "number" && Array.isArray(r.criteriaScores) && r.criteriaScores.length === 6
  );
  if (all.length <= 1) return main;
  const avgScore = Math.round(all.reduce((s, r) => s + r.credibilityScore, 0) / all.length);
  const avgCriteria = Array.from({ length: 6 }, (_, i) =>
    Math.round(all.reduce((s, r) => s + (r.criteriaScores[i] ?? 0), 0) / all.length)
  );
  return { credibilityScore: avgScore, criteriaScores: avgCriteria };
}

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

    const newsUserContent = `다음 뉴스 기사를 투자 관점에서 분석해주세요.\n\n제목: ${title}\nURL: ${url}\n\n내용:\n${cleanText}`;
    const [completion, extraCredibility] = await Promise.all([
      getOpenAI().chat.completions.create({
        model: "gpt-5.2",
        max_completion_tokens: 8192,
        temperature: 0.5,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: newsUserContent },
        ],
      }),
      runCredibilityRounds(newsUserContent),
    ]);

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = extractJSON(raw);
    const avgCred = parsed.isInvestmentContent
      ? averageCredibility({ credibilityScore: parsed.credibilityScore ?? 0, criteriaScores: parsed.criteriaScores ?? [0,0,0,0,0,0] }, extraCredibility)
      : { credibilityScore: 0, criteriaScores: [0,0,0,0,0,0] };

    res.json({
      ...parsed,
      ...avgCred,
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

    const ytUserContent = `다음 유튜브 투자 영상을 분석해주세요.\n\n제목: ${displayTitle}\n채널: ${channelName || "알 수 없음"}\nURL: ${url}\n\n${contentForAnalysis}`;
    const [completion, extraCredibility] = await Promise.all([
      getOpenAI().chat.completions.create({
        model: "gpt-5.2",
        max_completion_tokens: 8192,
        temperature: 0.5,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: ytUserContent },
        ],
      }),
      runCredibilityRounds(ytUserContent),
    ]);

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = extractJSON(raw);
    const avgCred = parsed.isInvestmentContent
      ? averageCredibility({ credibilityScore: parsed.credibilityScore ?? 0, criteriaScores: parsed.criteriaScores ?? [0,0,0,0,0,0] }, extraCredibility)
      : { credibilityScore: 0, criteriaScores: [0,0,0,0,0,0] };

    res.json({
      ...parsed,
      ...avgCred,
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

    const twitterUserContent = `다음 트위터(X) 게시물을 투자 관점에서 분석해주세요.\n\n작성자: ${authorName}\nURL: ${url}\n\n트윗 내용:\n${tweetText}`;
    const [completion, extraCredibility] = await Promise.all([
      getOpenAI().chat.completions.create({
        model: "gpt-5.2",
        max_completion_tokens: 8192,
        temperature: 0.5,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: twitterUserContent },
        ],
      }),
      runCredibilityRounds(twitterUserContent),
    ]);

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = extractJSON(raw);
    const avgCred = parsed.isInvestmentContent
      ? averageCredibility({ credibilityScore: parsed.credibilityScore ?? 0, criteriaScores: parsed.criteriaScores ?? [0,0,0,0,0,0] }, extraCredibility)
      : { credibilityScore: 0, criteriaScores: [0,0,0,0,0,0] };

    res.json({
      ...parsed,
      ...avgCred,
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
    const screenshotUserContent = [
      { type: "text", text: "이 투자 관련 스크린샷(차트, 실적표, 보고서 등)을 분석해주세요." },
      { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: "high" } },
    ];
    const screenshotCredContent = [
      { type: "text", text: "이 투자 관련 스크린샷(차트, 실적표, 보고서 등)의 신뢰도를 평가해주세요." },
      { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: "low" } },
    ];
    const [completion, extraCredibility] = await Promise.all([
      getOpenAI().chat.completions.create({
        model: "gpt-5.2",
        max_completion_tokens: 8192,
        temperature: 0.5,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: screenshotUserContent as any },
        ],
      }),
      runCredibilityRounds(screenshotCredContent),
    ]);

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = extractJSON(raw);
    const avgCred = parsed.isInvestmentContent
      ? averageCredibility({ credibilityScore: parsed.credibilityScore ?? 0, criteriaScores: parsed.criteriaScores ?? [0,0,0,0,0,0] }, extraCredibility)
      : { credibilityScore: 0, criteriaScores: [0,0,0,0,0,0] };

    res.json({
      ...parsed,
      ...avgCred,
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

  const parseRSS = (xml: string, limit = 6) => {
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const titleRegex = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/;
    const linkRegex = /<link>([\s\S]*?)<\/link>/;
    const pubDateRegex = /<pubDate>([\s\S]*?)<\/pubDate>/;
    const sourceRegex = /<source[^>]*>([\s\S]*?)<\/source>/;
    const news: { title: string; source: string; url: string; publishedAt: string }[] = [];
    let m: RegExpExecArray | null;
    while ((m = itemRegex.exec(xml)) !== null && news.length < limit) {
      const block = m[1];
      const rawTitle = block.match(titleRegex)?.[1]?.trim() ?? "";
      const url = block.match(linkRegex)?.[1]?.trim() ?? "";
      const pubDate = block.match(pubDateRegex)?.[1]?.trim() ?? "";
      const source = block.match(sourceRegex)?.[1]?.trim() ??
        rawTitle.match(/\s-\s([^-]+)$/)?.[1]?.trim() ?? "";
      const title = rawTitle.replace(/\s-\s[^-]+$/, "").trim();
      if (title) news.push({
        title, source, url,
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      });
    }
    return news;
  };

  const fetchRSS = async (query: string) => {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`;
    const response = await fetch(rssUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "application/rss+xml, application/xml, text/xml",
      },
      signal: AbortSignal.timeout(8000),
    });
    return response.text();
  };

  try {
    // 1차: 원본 쿼리 전체
    const xml1 = await fetchRSS(q.trim());
    let news = parseRSS(xml1, 6);

    // 2차: 첫 번째 키워드만으로 폴백
    if (news.length < 2) {
      const firstKeyword = q.trim().split(/\s+/)[0];
      if (firstKeyword && firstKeyword !== q.trim()) {
        const xml2 = await fetchRSS(firstKeyword);
        const fallback = parseRSS(xml2, 6);
        // 기존 결과 + 폴백 결과 합쳐서 중복 제거
        const seen = new Set(news.map(n => n.title));
        for (const item of fallback) {
          if (!seen.has(item.title)) { news.push(item); seen.add(item.title); }
          if (news.length >= 6) break;
        }
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
