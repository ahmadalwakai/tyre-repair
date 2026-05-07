'use client';
import { useReducedMotion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';
import { MotionBox } from './MotionBox';

export interface RevealOnScrollProps {
  children: ReactNode;
  delay?: number;
  yOffset?: number;
  once?: boolean;
}

export function RevealOnScroll({
  children,
  delay = 0,
  yOffset = 24,
  once = true,
}: RevealOnScrollProps) {
  const reduce = useReducedMotion();

  const variants: Variants = reduce
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: yOffset },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.6, ease: [0.2, 0, 0, 1], delay },
        },
      };

  return (
    <MotionBox
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: 0.2 }}
      variants={variants}
    >
      {children}
    </MotionBox>
  );
}
