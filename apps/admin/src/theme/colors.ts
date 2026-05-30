/**
 * Centralised colour tokens for the admin app.
 *
 * Use these instead of inline `#RRGGBB` literals so the premium
 * black/gold identity stays consistent across popups, cards and
 * ad-hoc inline styles. The Tailwind palette in `tailwind.config.js`
 * mirrors the same canonical values — keep them in sync if you edit.
 */

export const colors = {
  // Surfaces
  canvas: '#0B0B0F',
  surface: '#15151B',
  surfaceSoft: '#1D1D24',
  surfaceMuted: '#1F1F26',
  border: '#2A2A33',

  // Text
  text: '#F5F5F7',
  textLight: '#E5E5E5',
  textMuted: '#B5B5BD',
  textDim: '#888888',
  textFaint: '#7A7A7A',
  textGhost: '#666666',

  // Brand — emergency red (matches website). Token names kept as `gold*`
  // for backwards-compat; the underlying values are now red.
  gold: '#E30613',
  goldBright: '#F01825',
  goldSoft: '#FF8A95',
  goldDeep: '#8F0010',

  // Status accents (bright variants tuned for popups on dark surfaces)
  successBright: '#7CFFB2',
  warningBright: '#FFB347',
  dangerBright: '#FF7676',
  infoBright: '#7AB8FF',

  // External brands
  whatsapp: '#25D366',
} as const;

export type ColorToken = keyof typeof colors;
