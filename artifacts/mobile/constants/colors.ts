// InvestLens 색상 팔레트 - 딥 네이비 퍼플 핀테크 테마
const Colors = {
  // 배경
  background: '#0D0E1F',       // 딥 네이비 - 메인 배경
  surface: '#161728',          // 카드/서피스 배경
  surfaceElevated: '#1E1F35',  // 약간 높은 서피스
  border: '#2A2B45',           // 섬세한 보더
  borderLight: '#3A3B58',      // 밝은 보더

  // 브랜드 컬러
  primary: '#4B5FD6',          // 인디고 블루 - 주요 액션
  primaryLight: '#6677E8',     // 밝은 인디고
  accent: '#22C55E',           // 에메랄드 그린 - 양수/액센트
  accentLight: '#4ADE80',      // 밝은 그린

  // 시맨틱
  positive: '#22C55E',         // 초록 - 긍정 심리, 상승
  negative: '#EF4444',         // 빨강 - 부정 심리, 하락
  warning: '#F59E0B',          // 앰버 - 중립/경고
  neutral: '#94A3B8',          // 회색 - 중립 심리

  // 텍스트
  text: '#F0F0FF',             // 주요 텍스트 - 거의 흰색
  textSecondary: '#8B8FA8',    // 보조 텍스트 - 음소거됨
  textTertiary: '#5C5F78',     // 3차 텍스트 - 매우 음소거됨
  textInverse: '#0D0E1F',      // 밝은 배경 위 텍스트

  // 탭바
  tabIconDefault: '#5C5F78',
  tabIconSelected: '#4B5FD6',
  tint: '#4B5FD6',

  // 그라디언트
  gradientPrimary: ['#3346C4', '#4B5FD6', '#6677E8'] as const,
  gradientAccent: ['#16A34A', '#22C55E', '#4ADE80'] as const,
  gradientSurface: ['#161728', '#1E1F35'] as const,
  gradientBackground: ['#0D0E1F', '#161728', '#0D0E1F'] as const,

  // 리스크 레벨
  riskLow: '#22C55E',
  riskMedium: '#F59E0B',
  riskHigh: '#EF4444',

  // 신뢰도 점수
  credibilityHigh: '#22C55E',
  credibilityMedium: '#F59E0B',
  credibilityLow: '#EF4444',
};

export default Colors;

export type ColorKey = keyof typeof Colors;
