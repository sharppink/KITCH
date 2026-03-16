// OCR 서비스 - 플레이스홀더 구현
// 실제 서비스에서는 Google Cloud Vision 또는 AWS Textract를 사용합니다

export interface OCRResult {
  text: string;
  confidence: number;
  wordCount: number;
}

/**
 * 이미지 URI에서 텍스트 추출 (목업)
 */
export async function extractTextFromImage(imageUri: string): Promise<OCRResult> {
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const mockTexts = [
    `속보: 주요 기술 기업 4분기 실적 발표
    매출: 98.5조원 (전년비 +12%)
    EPS: 2,410원 (예상치 2,100원 상회)
    클라우드 부문: +28% 성장
    AI 제품이 신규 기업 계약의 40% 견인
    장외에서 주가 8% 상승
    CEO 코멘트: "AI 수익화 플라이휠은 이제 시작에 불과"`,

    `시장 업데이트 - 한국경제
    코스피 3,247.22 (+1.2%)
    코스닥 891.56 (+1.8%)
    
    상승 주도주: 삼성전자 +3.2%, SK하이닉스 +4.1%, NAVER +2.7%
    하락주: 현대차 -1.8%, 기아 -1.2%
    
    미 연준 의사록 2025년 금리 2회 인하 시사
    국고채 10년 3.21% (-8bp)`,

    `애널리스트 보고서: 매수 의견 개시
    기업: 넥스트젠AI테크놀로지
    목표주가: 245,000원 (현재: 178,000원)
    상승여력: 37.6%
    
    주요 촉매제:
    - 기업용 AI 계약 파이프라인 2.1조원
    - FY25 마진 300bp 개선 예상
    - 해외 사업 확장 진행 중
    
    리스크: 빅테크 경쟁, 규제 불확실성`,
  ];

  const randomText = mockTexts[Math.floor(Math.random() * mockTexts.length)];

  return {
    text: randomText,
    confidence: 0.87 + Math.random() * 0.12,
    wordCount: randomText.split(/\s+/).length,
  };
}
