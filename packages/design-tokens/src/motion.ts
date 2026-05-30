export const motion = {
  duration: { instant: 75, fast: 150, base: 250, slow: 400, slower: 600, slowest: 900 },
  easing: {
    standard:    [0.4, 0, 0.2, 1] as const,
    emphasized:  [0.2, 0, 0, 1]   as const,
    decelerate:  [0, 0, 0.2, 1]   as const,
    accelerate:  [0.4, 0, 1, 1]   as const,
  },
  // Emergency red glow (replaces former gold glow).
  glow: {
    soft:   '0 0 12px rgba(240,24,37,0.35)',
    medium: '0 0 20px rgba(240,24,37,0.55)',
    strong: '0 0 32px rgba(240,24,37,0.75), 0 0 60px rgba(143,0,16,0.40)',
  },
} as const;
