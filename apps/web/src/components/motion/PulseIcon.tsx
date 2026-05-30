'use client';
import { Box } from '@chakra-ui/react';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

const MotionBox = motion.create(Box);

export type PulseIconState = 'idle' | 'loading' | 'success' | 'error';

export interface PulseIconProps {
  state?: PulseIconState;
  size?: number;
  color?: string;
  ariaLabel?: string;
  children: ReactNode;
}

/**
 * Premium gold-glow pulsing icon. Used by CurrentLocationCard to give
 * the GPS icon a subtle, polished animation in the brand black/gold
 * design language.
 *
 * - idle:    slow gentle pulse + soft glow
 * - loading: faster pulse with two ripple rings radiating outward
 * - success: pulse stops, brief gold glow then settles
 * - error:   no pulse, no glow
 *
 * Honours `prefers-reduced-motion`.
 */
export function PulseIcon({
  state = 'idle',
  size = 56,
  color = '#E30613',
  ariaLabel,
  children,
}: PulseIconProps) {
  const reduced = useReducedMotion();

  // No animation at all when user prefers reduced motion or in error state.
  const animate = !reduced && state !== 'error';

  return (
    <Box
      position="relative"
      width={`${size}px`}
      height={`${size}px`}
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
    >
      {/* Soft gold glow halo */}
      {animate && (state === 'idle' || state === 'loading') && (
        <MotionBox
          position="absolute"
          inset="0"
          borderRadius="full"
          style={{
            background: `radial-gradient(circle, ${color}33 0%, transparent 70%)`,
          }}
          animate={{
            opacity: [0.35, 0.85, 0.35],
            scale: state === 'loading' ? [1, 1.25, 1] : [1, 1.12, 1],
          }}
          transition={{
            duration: state === 'loading' ? 1.1 : 1.8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Loading-only ripple rings */}
      {animate && state === 'loading' && (
        <>
          <MotionBox
            position="absolute"
            inset="0"
            borderRadius="full"
            borderWidth="1px"
            borderColor={color}
            initial={{ opacity: 0.6, scale: 0.8 }}
            animate={{ opacity: 0, scale: 1.7 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
          />
          <MotionBox
            position="absolute"
            inset="0"
            borderRadius="full"
            borderWidth="1px"
            borderColor={color}
            initial={{ opacity: 0.6, scale: 0.8 }}
            animate={{ opacity: 0, scale: 1.7 }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              ease: 'easeOut',
              delay: 0.7,
            }}
          />
        </>
      )}

      {/* Success: brief expanding glow then settle */}
      {animate && state === 'success' && (
        <MotionBox
          position="absolute"
          inset="0"
          borderRadius="full"
          style={{
            background: `radial-gradient(circle, ${color}55 0%, transparent 70%)`,
          }}
          initial={{ opacity: 0.9, scale: 0.6 }}
          animate={{ opacity: 0, scale: 1.6 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      )}

      {/* Icon centered above the effects */}
      <Box position="relative" zIndex={1} color={color} lineHeight="1">
        {children}
      </Box>
    </Box>
  );
}
