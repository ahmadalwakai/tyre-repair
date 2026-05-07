export const colors = {
  bg:    { primary: '#0A0A0A', secondary: '#141414', elevated: '#1A1A1A', overlay: 'rgba(0,0,0,0.72)' },
  text:  { primary: '#FFFFFF', secondary: '#B8B8B8', muted: '#7A7A7A', inverse: '#0A0A0A' },
  gold: {
    50: '#FFF8E1', 100: '#FFECB3', 300: '#FFD54F',
    500: '#D4AF37',
    600: '#C19B26', 700: '#A8861E',
    neon: '#FFD700',
  },
  semantic: { success: '#22C55E', warning: '#F59E0B', error: '#EF4444', info: '#3B82F6' },
  border:   { subtle: 'rgba(212,175,55,0.20)', default: 'rgba(212,175,55,0.40)', strong: '#D4AF37' },
} as const;
