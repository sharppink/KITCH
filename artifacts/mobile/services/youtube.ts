// 유튜브 파서 서비스
// 유튜브 URL에서 영상 ID 및 메타데이터 추출

export interface YouTubeVideoInfo {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelName: string;
  mockTranscript: string;
}

/**
 * 다양한 URL 형식에서 유튜브 영상 ID 추출
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }

  return null;
}

export function isValidYouTubeUrl(url: string): boolean {
  return extractVideoId(url) !== null;
}

export function getThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

/**
 * 유튜브 영상 메타데이터 목업 조회
 */
export async function fetchVideoInfo(videoId: string): Promise<YouTubeVideoInfo> {
  await new Promise((resolve) => setTimeout(resolve, 800));

  const mockVideos: Partial<YouTubeVideoInfo>[] = [
    {
      title: '2025년 엔비디아 주식, 지금 매수해야 하는 이유',
      description: 'AI 칩 시장에서 엔비디아의 독보적 지위, 데이터센터 성장, 현재 주가 적정성을 심층 분석합니다.',
      channelName: '테크인베스터 PRO',
      mockTranscript: `오늘은 엔비디아와 2025년에 이 종목에 집중해야 하는 이유를 이야기합니다.
      H100과 H200 GPU는 사실상 AI 골드러시의 곡괭이와 삽입니다.
      데이터센터 매출은 전년 대비 400% 성장했습니다.
      마이크로소프트, 구글, 아마존이 GPU 확보를 위해 치열하게 경쟁하고 있습니다.
      40배 포워드 PER이 고평가인지 의문이지만, CUDA 소프트웨어 해자를 고려하면 그렇지 않습니다.
      2025년 말 목표주가는 180달러, 현재 대비 25% 상승여력입니다.`,
    },
    {
      title: '비트코인 현물 ETF의 충격 — 개인 투자자가 알아야 할 것',
      description: '비트코인 현물 ETF가 기관 자금 유입에 미치는 실질적 영향과 개인 투자자를 위한 시사점을 분석합니다.',
      channelName: '크립토인사이트 데일리',
      mockTranscript: `비트코인 ETF는 암호화폐 투자 환경을 근본적으로 바꿔 놓았습니다.
      블랙록 아이셰어즈 비트코인 트러스트는 출시 6개월 만에 25조원 이상을 운용하고 있습니다.
      기관 자금 흐름이 전례 없는 방식으로 가격을 결정하고 있습니다.
      4월 반감기는 공급을 50% 줄여 고전적인 공급 충격 조건을 만들었습니다.
      비트코인의 1억원 돌파에 대해 신중하게 낙관하지만, 경로는 직선이 아닐 것입니다.`,
    },
    {
      title: '버핏의 포트폴리오 변화 — 지금 무엇을 사고 있나',
      description: '버크셔 해서웨이 최신 13F 공시를 분석하고 버핏의 행보가 시장에 주는 시사점을 파악합니다.',
      channelName: '가치투자 투데이',
      mockTranscript: `버크셔 해서웨이 최신 13F에서 놀라운 움직임이 포착됩니다.
      버핏은 애플 비중을 포트폴리오의 50%에서 40%로 대폭 축소했습니다.
      현금을 170조원 수준의 사상 최고치로 늘리며 밸류에이션에 대한 경계심을 드러냈습니다.
      옥시덴털 페트롤리엄 지분을 새롭게 대규모로 편입했습니다.
      현금은 전략적 무기이며, 5% 수익률에서 기다리는 것도 나쁘지 않다고 판단한 듯합니다.`,
    },
  ];

  const video = mockVideos[Math.floor(Math.random() * mockVideos.length)];

  return {
    videoId,
    title: video.title!,
    description: video.description!,
    thumbnailUrl: getThumbnailUrl(videoId),
    channelName: video.channelName!,
    mockTranscript: video.mockTranscript!,
  };
}
