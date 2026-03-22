export const tradnexTheme = {
  background: '#000000',
  surface: '#0B0B0F',
  surfaceElevated: '#12131A',
  surfaceMuted: '#171922',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(10,132,255,0.28)',
  textPrimary: '#F5F7FA',
  textSecondary: '#8F97A8',
  textMuted: '#667085',
  accent: '#0A84FF',
  accentSoft: 'rgba(10,132,255,0.16)',
  success: '#00C48C',
  warning: '#FF9500',
  danger: '#FF3B30',
  white: '#FFFFFF',
} as const;

export const tradnexShadow = {
  shadowColor: '#0A84FF',
  shadowOpacity: 0.18,
  shadowRadius: 24,
  shadowOffset: {
    width: 0,
    height: 8,
  },
  elevation: 10,
} as const;

export type TradnexTheme = typeof tradnexTheme;
