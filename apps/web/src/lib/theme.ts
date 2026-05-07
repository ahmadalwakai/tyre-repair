import { createSystem, defaultConfig, defineConfig, defineRecipe } from '@chakra-ui/react';
import { colors, motion, radii, typography } from '@tyrerepair/design-tokens';

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        bg:           { value: colors.bg.primary },
        bgSecondary:  { value: colors.bg.secondary },
        bgElevated:   { value: colors.bg.elevated },
        text:         { value: colors.text.primary },
        textSecondary:{ value: colors.text.secondary },
        textMuted:    { value: colors.text.muted },
        gold:         { value: colors.gold[500] },
        goldDark:     { value: colors.gold[700] },
        goldNeon:     { value: colors.gold.neon },
        borderSubtle: { value: colors.border.subtle },
        borderGold:   { value: colors.border.strong },
        success:      { value: colors.semantic.success },
        error:        { value: colors.semantic.error },
      },
      fonts: {
        heading: { value: typography.fonts.heading },
        body:    { value: typography.fonts.body },
      },
      radii: {
        sm:   { value: radii.sm },
        md:   { value: radii.md },
        lg:   { value: radii.lg },
        xl:   { value: radii.xl },
        full: { value: radii.full },
      },
      shadows: {
        glowSoft:   { value: motion.glow.soft },
        glowMedium: { value: motion.glow.medium },
        glowStrong: { value: motion.glow.strong },
      },
    },
    semanticTokens: {
      colors: {
        'bg.canvas':    { value: '{colors.bg}' },
        'bg.surface':   { value: '{colors.bgElevated}' },
        'fg.default':   { value: '{colors.text}' },
        'fg.muted':     { value: '{colors.textMuted}' },
        'accent.solid': { value: '{colors.gold}' },
        'accent.neon':  { value: '{colors.goldNeon}' },
        'border.subtle':{ value: '{colors.borderSubtle}' },
        'border.gold':  { value: '{colors.borderGold}' },
      },
    },
    recipes: {
      button: defineRecipe({
        base: {
          fontFamily: 'body',
          fontWeight: '600',
          borderRadius: 'lg',
          transition: 'transform 0.2s, box-shadow 0.2s, background 0.2s',
          cursor: 'pointer',
          _disabled: { opacity: 0.5, cursor: 'not-allowed' },
        },
        variants: {
          visual: {
            gold: {
              bg: 'accent.solid',
              color: 'bg.canvas',
              _hover: { boxShadow: 'glowMedium', transform: 'translateY(-1px)' },
              _active: { transform: 'translateY(0)' },
            },
            outline: {
              bg: 'transparent',
              color: 'accent.solid',
              borderWidth: '1px',
              borderColor: 'accent.solid',
              _hover: { boxShadow: 'glowSoft', bg: 'rgba(212,175,55,0.08)' },
            },
            ghost: {
              bg: 'transparent',
              color: 'fg.default',
              _hover: { bg: 'bg.surface' },
            },
          },
          size: {
            sm: { px: '3', py: '2', fontSize: 'sm', minH: '36px' },
            md: { px: '5', py: '3', fontSize: 'md', minH: '44px' },
            lg: { px: '7', py: '4', fontSize: 'lg', minH: '52px' },
          },
        },
        defaultVariants: { visual: 'gold', size: 'md' },
      }),
    },
    keyframes: {
      neonPulse: {
        '0%, 100%': { boxShadow: '0 0 12px rgba(255,215,0,0.35)' },
        '50%': { boxShadow: '0 0 28px rgba(255,215,0,0.7)' },
      },
      shimmer: {
        '0%': { backgroundPosition: '-200% 0' },
        '100%': { backgroundPosition: '200% 0' },
      },
    },
  },
  globalCss: {
    'html, body': {
      bg: 'bg.canvas',
      color: 'fg.default',
      minHeight: '100vh',
      fontFamily: 'body',
    },
    body: {
      WebkitFontSmoothing: 'antialiased',
    } as never,
    '*::selection': { bg: 'rgba(212,175,55,0.3)', color: 'white' },
  },
});

export const system = createSystem(defaultConfig, config);
