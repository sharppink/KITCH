// OCR Service - Placeholder implementation
// In production, this would use a vision API (e.g. Google Cloud Vision, AWS Textract)

export interface OCRResult {
  text: string;
  confidence: number;
  wordCount: number;
}

/**
 * Mock OCR extraction from image URI
 * In production: upload image to OCR API and return extracted text
 */
export async function extractTextFromImage(imageUri: string): Promise<OCRResult> {
  // Simulate OCR processing time
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const mockTexts = [
    `BREAKING: Major tech company reports record Q4 earnings
    Revenue: $98.5B (+12% YoY)
    EPS: $2.41 (beat est. $2.10)
    Cloud segment: +28% growth
    AI products driving 40% of new enterprise contracts
    Stock up 8% in after-hours trading
    CEO comments: "We are just beginning to see the AI monetization flywheel"`,

    `MARKET UPDATE - Financial Times
    S&P 500 closes at all-time high: 5,847.22 (+1.2%)
    Nasdaq Composite: 18,391 (+1.8%)
    Dow Jones: 42,156 (+0.9%)
    
    Top gainers: NVDA +6.2%, META +4.1%, AMZN +3.7%
    Top losers: CVX -2.1%, XOM -1.8%
    
    Fed minutes suggest two rate cuts in 2025
    10-year Treasury yield: 4.21% (-8bps)`,

    `Analyst Report: BUY Rating Initiated
    Company: NextGen AI Technologies
    Price Target: $245 (current: $178)
    Upside: 37.6%
    
    Key catalysts:
    - Enterprise AI contracts pipeline $2.1B
    - Margin expansion 300bps expected FY25
    - International expansion underway
    
    Risks: Competition from Big Tech, regulation uncertainty`,
  ];

  const randomText = mockTexts[Math.floor(Math.random() * mockTexts.length)];

  return {
    text: randomText,
    confidence: 0.87 + Math.random() * 0.12, // 87-99% confidence
    wordCount: randomText.split(/\s+/).length,
  };
}
