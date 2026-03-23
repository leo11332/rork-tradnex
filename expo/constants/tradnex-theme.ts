export const tradnexTheme = {
  background: '#0A0A0A',
  surface: '#1A1A1E',
  surfaceElevated: '#242428',
  surfaceMuted: '#141418',
  border: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(10,132,255,0.22)',
  textPrimary: '#FFFFFF',
  textSecondary: '#9A9A9E',
  textMuted: '#5A5A5E',
  accent: '#0A84FF',
  accentSoft: 'rgba(10,132,255,0.12)',
  success: '#00F19B',
  warning: '#FFB800',
  danger: '#FF4654',
  white: '#FFFFFF',
  blue: '#0085FF',
  teal: '#00D1C4',
} as const;

export const tradnexShadow = {
  shadowColor: '#0A84FF',
  shadowOpacity: 0.12,
  shadowRadius: 20,
  shadowOffset: {
    width: 0,
    height: 6,
  },
  elevation: 8,
} as const;

export type TradnexTheme = typeof tradnexTheme;
