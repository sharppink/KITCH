// InvestLens color palette - Modern fintech dark theme
const Colors = {
  // Backgrounds
  background: '#0F172A',       // Deep navy - main background
  surface: '#1E293B',          // Card/surface background
  surfaceElevated: '#243447',  // Slightly elevated surface
  border: '#334155',           // Subtle border
  borderLight: '#475569',      // Lighter border

  // Brand colors
  primary: '#2563EB',          // Electric blue - primary actions
  primaryLight: '#3B82F6',     // Lighter blue
  accent: '#22C55E',           // Emerald green - positive/accent
  accentLight: '#4ADE80',      // Lighter green

  // Semantic
  positive: '#22C55E',         // Green - positive sentiment, gains
  negative: '#EF4444',         // Red - negative sentiment, losses
  warning: '#F59E0B',          // Amber - medium/warning
  neutral: '#94A3B8',          // Gray - neutral sentiment

  // Text
  text: '#F8FAFC',             // Primary text - near white
  textSecondary: '#94A3B8',    // Secondary text - muted
  textTertiary: '#64748B',     // Tertiary text - very muted
  textInverse: '#0F172A',      // Text on light backgrounds

  // Tab bar
  tabIconDefault: '#64748B',
  tabIconSelected: '#2563EB',
  tint: '#2563EB',

  // Gradients (used with LinearGradient)
  gradientPrimary: ['#1D4ED8', '#2563EB', '#3B82F6'] as const,
  gradientAccent: ['#16A34A', '#22C55E', '#4ADE80'] as const,
  gradientSurface: ['#1E293B', '#243447'] as const,
  gradientDanger: ['#B91C1C', '#EF4444'] as const,
  gradientBackground: ['#0F172A', '#1E293B', '#0F172A'] as const,

  // Risk levels
  riskLow: '#22C55E',
  riskMedium: '#F59E0B',
  riskHigh: '#EF4444',

  // Credibility score
  credibilityHigh: '#22C55E',
  credibilityMedium: '#F59E0B',
  credibilityLow: '#EF4444',
};

export default Colors;

export type ColorKey = keyof typeof Colors;
