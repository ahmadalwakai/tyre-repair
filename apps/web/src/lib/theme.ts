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
        // Emergency red brand tokens (Phase 1).
        redPrimary:   { value: colors.red.primary },
        redHover:     { value: colors.red.hover },
        redDark:      { value: colors.red.dark },
        redBright:    { value: colors.red.bright },
        // Legacy gold-named tokens retained for backward compatibility,
        // now resolving to the new red palette so existing components
        // automatically pick up the emergency accent.
        gold:         { value: colors.red.primary },
        goldDark:     { value: colors.red.dark },
        goldNeon:     { value: colors.red.bright },
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
        // Emergency red accent set.
        'accent.solid': { value: '{colors.redPrimary}' },
        'accent.neon':  { value: '{colors.redBright}' },
        'accent.hover': { value: '{colors.redHover}' },
        'accent.deep':  { value: '{colors.redDark}' },
        'border.subtle':{ value: '{colors.borderSubtle}' },
        'border.accent':{ value: '{colors.borderGold}' },
        // Backward-compatible alias — existing references to border.gold
        // continue to compile but now render in red.
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
            // Variant name retained for backward compatibility; visual
            // output is now emergency red.
            gold: {
              bg: 'accent.solid',
              color: 'white',
              _hover: {
                bg: 'accent.hover',
                boxShadow: 'glowMedium',
                transform: 'translateY(-1px)',
              },
              _active: { bg: 'accent.deep', transform: 'translateY(0)' },
            },
            outline: {
              bg: 'transparent',
              color: 'accent.solid',
              borderWidth: '1px',
              borderColor: 'accent.solid',
              _hover: { boxShadow: 'glowSoft', bg: 'rgba(227,6,19,0.08)' },
            },
            ghost: {
              bg: 'transparent',
              color: 'accent.solid',
              _hover: { bg: 'rgba(227,6,19,0.08)' },
            },
          },
          size: {
            sm: { px: '3', py: '2', fontSize: 'sm', minH: '40px' },
            md: { px: '5', py: '3', fontSize: 'md', minH: '44px' },
            lg: { px: '7', py: '4', fontSize: 'lg', minH: '52px' },
          },
        },
        defaultVariants: { visual: 'gold', size: 'md' },
      }),
    },
    keyframes: {
      neonPulse: {
        '0%, 100%': { boxShadow: '0 0 12px rgba(240,24,37,0.35)' },
        '50%': { boxShadow: '0 0 28px rgba(240,24,37,0.7)' },
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
    '*::selection': { bg: 'rgba(227,6,19,0.30)', color: 'white' },
    // Keyboard-only focus ring in emergency red. Mouse focus retains
    // Chakra defaults because :focus-visible only matches keyboard focus.
    ':focus-visible': {
      outline: '2px solid',
      outlineColor: 'accent.solid',
      outlineOffset: '2px',
    },
  },
});

export const system = createSystem(defaultConfig, config);
