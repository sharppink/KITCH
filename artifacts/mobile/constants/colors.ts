// KITCH 색상 팔레트 - 키움증권 UI 스타일
const Colors = {
  // 배경
  background: '#F5F5FA',
  /** @deprecated `background`와 동일 — 기존 코드 호환용 */
  bg: '#F5F5FA',
  surface: '#FFFFFF',
  surfaceElevated: '#EBEBF4',
  border: '#E0E0EC',
  borderLight: '#EFEFF8',

  // 브랜드 (키움 보라 계열)
  primary: '#5B35B5',
  primaryLight: '#7B5BD4',
  primaryBg: '#F0EBFF',
  accent: '#00B14F',

  // 한국 주식 컬러
  positive: '#E22C29',   // 빨강 = 상승
  negative: '#0052CC',   // 파랑 = 하락
  warning: '#F59E0B',
  neutral: '#64647A',

  // 텍스트
  text: '#1A1A2E',
  textSecondary: '#64647A',
  textTertiary: '#9898A8',
  textInverse: '#FFFFFF',

  // 탭바
  tabIconDefault: '#9898A8',
  tabIconSelected: '#5B35B5',
  tint: '#5B35B5',

  // 그라디언트
  gradientPrimary: ['#4A28A0', '#5B35B5', '#7B5BD4'] as const,
  gradientSurface: ['#FFFFFF', '#F5F5FA'] as const,

  // 리스크/신뢰도
  riskLow: '#00B14F',
  riskMedium: '#F59E0B',
  riskHigh: '#E22C29',
  credibilityHigh: '#00B14F',
  credibilityMedium: '#F59E0B',
  credibilityLow: '#E22C29',

  // 키움 전용
  kiwoomPurple: '#5B35B5',
  kiwoomNavy: '#1A1464',
  kiwoomRed: '#E22C29',
};

export default Colors;
export type ColorKey = keyof typeof Colors;
