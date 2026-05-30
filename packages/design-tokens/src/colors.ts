export const colors = {
  bg:    { primary: '#0A0A0A', secondary: '#141414', elevated: '#1A1A1A', overlay: 'rgba(0,0,0,0.72)' },
  text:  { primary: '#FFFFFF', secondary: '#B8B8B8', muted: '#9A9A9A', inverse: '#0A0A0A' },
  // Emergency red brand scale (Phase 1 — replaces former gold accents).
  red: {
    primary: '#E30613',
    hover:   '#C90012',
    dark:    '#8F0010',
    bright:  '#F01825',
    deepest: '#D90416',
    gradient: 'linear-gradient(135deg, #F01825 0%, #D90416 100%)',
  },
  // Legacy gold scale retained as backward-compatible alias values only.
  // Gold tones are no longer surfaced through semantic tokens; do not
  // reintroduce gold accents in new components.
  gold: {
    50: '#FFF8E1', 100: '#FFECB3', 300: '#FFD54F',
    500: '#D4AF37',
    600: '#C19B26', 700: '#A8861E',
    neon: '#FFD700',
  },
  semantic: { success: '#22C55E', warning: '#F59E0B', error: '#EF4444', info: '#3B82F6' },
  border:   { subtle: 'rgba(227,6,19,0.20)', default: 'rgba(227,6,19,0.40)', strong: '#E30613' },
} as const;
