// YouTube Parser Service
// Extracts video ID and metadata from YouTube URLs

export interface YouTubeVideoInfo {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelName: string;
  mockTranscript: string;
}

/**
 * Extract YouTube video ID from various URL formats
 * Supports: youtu.be/ID, youtube.com/watch?v=ID, youtube.com/embed/ID
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/, // Raw video ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Validate YouTube URL format
 */
export function isValidYouTubeUrl(url: string): boolean {
  return extractVideoId(url) !== null;
}

/**
 * Get YouTube thumbnail URL from video ID
 */
export function getThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

/**
 * Mock YouTube video metadata fetch
 * In production: use YouTube Data API v3
 */
export async function fetchVideoInfo(videoId: string): Promise<YouTubeVideoInfo> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  const mockVideos: Partial<YouTubeVideoInfo>[] = [
    {
      title: 'Why I\'m All In On NVIDIA Stock in 2025',
      description: 'Deep dive into NVIDIA\'s AI chip dominance, data center growth, and whether the stock is overvalued at current prices.',
      channelName: 'TechInvestor Pro',
      mockTranscript: `Today we're talking about NVIDIA and why I think it's the most important stock to own heading into 2025. 
      The company's H100 and H200 GPUs are essentially the picks and shovels of the AI gold rush. 
      Data center revenue has grown 400% year over year. Microsoft, Google, and Amazon are all competing fiercely for GPU capacity. 
      The real question is whether the stock at 40x forward earnings is overvalued. I don't think so when you factor in the software moat from CUDA. 
      My price target for end of 2025 is $180, representing 25% upside from current levels. Risk factors include AMD competition and potential China export restrictions.`,
    },
    {
      title: 'The Truth About Crypto in 2025 - Bitcoin ETF Impact',
      description: 'Analyzing the real impact of Bitcoin ETFs on institutional adoption and what it means for retail investors.',
      channelName: 'CryptoInsights Daily',
      mockTranscript: `Bitcoin ETFs have fundamentally changed the landscape for crypto investing. 
      BlackRock's iShares Bitcoin Trust now holds over $25B in assets after just 6 months. 
      Institutional flows are driving price discovery in ways we've never seen before. 
      The halvening in April reduced supply by 50%, creating classic supply shock conditions. 
      I'm cautiously bullish on Bitcoin reaching $100k but the path won't be linear. 
      Alt coins remain highly speculative. Only invest what you can afford to lose completely.`,
    },
    {
      title: 'Warren Buffett\'s Portfolio Changes - What He\'s Buying Now',
      description: 'Breaking down Berkshire Hathaway\'s latest 13F filing and what Buffett\'s moves tell us about the market.',
      channelName: 'ValueInvesting Today',
      mockTranscript: `Berkshire Hathaway's latest 13F filing reveals some surprising moves. 
      Buffett has been trimming Apple dramatically - down from 50% of portfolio to 40%. 
      He's been building cash to record levels near $170B, suggesting caution about valuations. 
      New additions include a significant stake in Occidental Petroleum's oil operations. 
      The Oracle of Omaha is clearly concerned about market valuations after the recent rally. 
      Cash is a strategic weapon, and at 5% yields, sitting in T-bills isn't a bad return while waiting.`,
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
