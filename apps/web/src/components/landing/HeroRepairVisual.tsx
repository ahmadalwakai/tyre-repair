'use client';

import { useEffect, useState } from 'react';
import { Box, Flex, Stack, Text, Wrap } from '@chakra-ui/react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FiCheckCircle, FiTool } from 'react-icons/fi';
import { GoldBadge } from '@/components/ui/GoldBadge';

/**
 * Animated repair-first hero visual.
 *
 * Loop (~5s):
 *  0.0s  pause (tyre still)
 *  0.5s  tyre spins (≈1.4s)
 *  1.9s  slows + stops with puncture aligned (≈0.6s)
 *  2.5s  arrow draws toward puncture (≈0.5s)
 *  3.0s  "Repaired" label fades + scales in (≈0.4s)
 *  3.4s  hold repaired state (≈1.0s)
 *  4.4s  reset, restart
 */
type Phase = 'idle' | 'spin' | 'stop' | 'arrow' | 'repaired';

const TIMINGS: Record<Phase, number> = {
  idle: 500,
  spin: 1400,
  stop: 600,
  arrow: 500,
  repaired: 1400,
};

const NEXT: Record<Phase, Phase> = {
  idle: 'spin',
  spin: 'stop',
  stop: 'arrow',
  arrow: 'repaired',
  repaired: 'idle',
};

export function HeroRepairVisual() {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('idle');

  useEffect(() => {
    if (reduce) return;
    const id = window.setTimeout(() => setPhase((p) => NEXT[p]), TIMINGS[phase]);
    return () => window.clearTimeout(id);
  }, [phase, reduce]);

  const showArrow = !reduce && (phase === 'arrow' || phase === 'repaired');
  const showRepaired = reduce || phase === 'repaired';

  return (
    <Box
      position="relative"
      w="full"
      h={{ base: '280px', md: '360px', lg: '460px' }}
      borderRadius="24px"
      overflow="hidden"
      bg="#0A0A0A"
      borderWidth="1px"
      borderColor="rgba(212,175,55,0.35)"
      boxShadow="0 0 40px rgba(255,215,0,0.12), inset 0 0 0 1px rgba(255,215,0,0.05)"
      px={{ base: '4', md: '5' }}
      py={{ base: '4', md: '5' }}
    >
      {/* Top badges */}
      <Wrap gap={{ base: '2', md: '3' }} position="relative" zIndex="2">
        <GoldBadge icon={<FiCheckCircle />}>Repair-first assessment</GoldBadge>
        <GoldBadge icon={<FiTool />}>Puncture repair</GoldBadge>
      </Wrap>

      {/* Soft radial highlight behind tyre */}
      <Box
        aria-hidden
        position="absolute"
        inset="0"
        bgGradient="radial(circle at 50% 50%, rgba(255,215,0,0.18), rgba(212,175,55,0.05) 40%, transparent 70%)"
        pointerEvents="none"
      />

      {/* Centred tyre area */}
      <Flex
        position="absolute"
        inset="0"
        align="center"
        justify="center"
        pointerEvents="none"
        pt={{ base: '10', md: '14' }}
        pb={{ base: '20', md: '24' }}
      >
        <Box
          position="relative"
          w={{ base: '170px', md: '210px', lg: '240px' }}
          h={{ base: '170px', md: '210px', lg: '240px' }}
        >
          <TyreSvg
            phase={phase}
            reduce={Boolean(reduce)}
          />

          {/* Animated arrow → repair point */}
          <AnimatePresence>
            {showArrow ? (
              <motion.svg
                key="arrow"
                viewBox="0 0 240 240"
                width="100%"
                height="100%"
                style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <motion.path
                  d="M 200 40 Q 160 30 130 60"
                  fill="none"
                  stroke="#FFD700"
                  strokeWidth="3"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                />
                <motion.polyline
                  points="124,52 130,60 122,68"
                  fill="none"
                  stroke="#FFD700"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.2 }}
                />
              </motion.svg>
            ) : null}
          </AnimatePresence>

          {/* "Repaired" tag */}
          <AnimatePresence>
            {showRepaired ? (
              <motion.div
                key="repaired"
                initial={reduce ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  top: '6%',
                  right: '-8%',
                  background: 'linear-gradient(135deg, #FFE17A, #A8801C)',
                  color: '#0A0A0A',
                  fontWeight: 800,
                  fontSize: '11px',
                  letterSpacing: '1px',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  boxShadow: '0 0 14px rgba(255,215,0,0.35)',
                }}
              >
                REPAIRED
              </motion.div>
            ) : null}
          </AnimatePresence>
        </Box>
      </Flex>

      {/* Bottom message */}
      <Stack
        position="absolute"
        left="0"
        right="0"
        bottom={{ base: '4', md: '5' }}
        px={{ base: '4', md: '5' }}
        gap="1"
        textAlign="center"
        zIndex="2"
      >
        <Text
          fontFamily="heading"
          fontSize={{ base: 'xl', md: '2xl', lg: '3xl' }}
          fontWeight="800"
          lineHeight="1.1"
          color="accent.neon"
        >
          Repair First.
        </Text>
        <Text
          fontFamily="heading"
          fontSize={{ base: 'md', md: 'lg', lg: 'xl' }}
          fontWeight="700"
          color="fg.default"
        >
          Replace if needed.
        </Text>
        <Text fontSize="xs" color="fg.muted">
          Honest assessment. No upsell.
        </Text>
      </Stack>
    </Box>
  );
}

interface TyreSvgProps {
  phase: Phase;
  reduce: boolean;
}

function TyreSvg({ phase, reduce }: TyreSvgProps) {
  // Rotation target per phase. Stops at 0deg with puncture aligned to top-right.
  const rotate = (() => {
    if (reduce) return 0;
    switch (phase) {
      case 'idle':
        return 0;
      case 'spin':
        return 1080; // 3 full turns
      case 'stop':
      case 'arrow':
      case 'repaired':
        return 1080; // hold final position
    }
  })();

  const duration = (() => {
    if (reduce) return 0;
    switch (phase) {
      case 'spin':
        return 1.4;
      case 'stop':
        return 0.6;
      default:
        return 0;
    }
  })();

  const ease: [number, number, number, number] =
    phase === 'stop' ? [0.22, 1, 0.36, 1] : [0.4, 0, 0.6, 1];

  // Show puncture marker only when stopped/arrow phase
  const showPuncture = reduce || phase === 'stop' || phase === 'arrow' || phase === 'repaired';
  const showPatch = reduce || phase === 'repaired';

  return (
    <motion.svg
      viewBox="0 0 240 240"
      width="100%"
      height="100%"
      style={{ display: 'block' }}
      aria-label="Tyre repair illustration"
      role="img"
    >
      <defs>
        <radialGradient id="tyreRubber" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#2a2a2a" />
          <stop offset="80%" stopColor="#0d0d0d" />
          <stop offset="100%" stopColor="#000" />
        </radialGradient>
        <linearGradient id="tyreGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFE17A" />
          <stop offset="100%" stopColor="#A8801C" />
        </linearGradient>
        <radialGradient id="tyreRim" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#5a4214" />
          <stop offset="60%" stopColor="#2a1f08" />
          <stop offset="100%" stopColor="#0a0a0a" />
        </radialGradient>
      </defs>

      {/* Spinning group: tyre + rim + tread + puncture position */}
      <motion.g
        style={{ originX: '50%', originY: '50%', transformBox: 'fill-box' }}
        animate={{ rotate }}
        transition={{ duration, ease }}
      >
        {/* Outer rubber */}
        <circle cx="120" cy="120" r="108" fill="url(#tyreRubber)" stroke="#000" strokeWidth="2" />
        <circle cx="120" cy="120" r="100" fill="none" stroke="#1d1d1d" strokeWidth="1.2" />

        {/* Tread blocks */}
        <g fill="#161616" stroke="#000" strokeWidth="1">
          {Array.from({ length: 24 }).map((_, i) => (
            <g key={i} transform={`rotate(${i * 15} 120 120)`}>
              <rect x="112" y="14" width="16" height="20" rx="2" />
            </g>
          ))}
        </g>

        {/* Inner sidewall */}
        <circle cx="120" cy="120" r="78" fill="#0a0a0a" stroke="#000" strokeWidth="2" />

        {/* Alloy rim */}
        <circle cx="120" cy="120" r="68" fill="url(#tyreRim)" stroke="url(#tyreGold)" strokeWidth="1.5" />

        {/* 5-spoke alloy */}
        <g fill="url(#tyreGold)" stroke="#3a2a08" strokeWidth="1">
          {[0, 72, 144, 216, 288].map((deg) => (
            <path
              key={deg}
              d="M 120 60 L 126 100 L 114 100 Z"
              transform={`rotate(${deg} 120 120)`}
            />
          ))}
        </g>
        <circle cx="120" cy="120" r="20" fill="url(#tyreGold)" stroke="#3a2a08" strokeWidth="1.5" />
        <circle cx="120" cy="120" r="6" fill="#0a0a0a" />

        {/* Puncture marker (top-right, ~30° from top), revealed when stopped */}
        {showPuncture ? (
          <g transform="translate(170 50)">
            {/* nail */}
            {!showPatch ? (
              <>
                <line x1="0" y1="0" x2="-6" y2="14" stroke="#ff3a3a" strokeWidth="3" strokeLinecap="round" />
                <circle r="4" fill="#ff3a3a" />
                <circle r="9" fill="none" stroke="#ff3a3a" strokeWidth="1.5" opacity="0.6" />
              </>
            ) : (
              <>
                {/* repaired patch */}
                <circle r="11" fill="url(#tyreGold)" stroke="#3a2a08" strokeWidth="1.5" />
                <path
                  d="M -5 0 L -1 4 L 5 -4"
                  fill="none"
                  stroke="#0a0a0a"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}
          </g>
        ) : null}
      </motion.g>

      {/* Subtle gold rim glow ring (static) */}
      <circle
        cx="120"
        cy="120"
        r="108"
        fill="none"
        stroke="url(#tyreGold)"
        strokeWidth="0.8"
        opacity="0.55"
      />
    </motion.svg>
  );
}

export default HeroRepairVisual;
