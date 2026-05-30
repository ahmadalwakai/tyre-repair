import React, { useEffect, useRef, useState } from 'react';
import { Text, type TextProps } from 'react-native';

/**
 * CountUp — animates a number from `from` to `to` over `duration` ms.
 *
 * Great for stat tiles ("£0 \u2192 £2,431"), lead counts, etc. Keeps the
 * "live dashboard" feeling without spamming re-renders: uses a single rAF
 * loop and only commits state at ~60 fps.
 *
 *   <CountUp to={revenueToday} prefix="\u00a3" decimals={2} />
 *
 * On unmount it stops cleanly. On `to` changes it animates from the
 * current displayed value, not from zero.
 */
export interface CountUpProps extends Omit<TextProps, 'children'> {
  to: number;
  from?: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /** Pass a custom formatter to override prefix/suffix/decimals. */
  format?: (value: number) => string;
}

export function CountUp({
  to,
  from,
  duration = 900,
  decimals = 0,
  prefix = '',
  suffix = '',
  format,
  ...textProps
}: CountUpProps): React.JSX.Element {
  const [value, setValue] = useState<number>(from ?? to);
  const fromRef = useRef<number>(from ?? to);
  const startedAtRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = fromRef.current;
    const delta = to - start;
    if (delta === 0) {
      setValue(to);
      return;
    }
    startedAtRef.current = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startedAtRef.current;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const next = start + delta * eased;
      setValue(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      fromRef.current = value;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, duration]);

  const display = format
    ? format(value)
    : `${prefix}${value.toLocaleString('en-GB', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}${suffix}`;

  return <Text {...textProps}>{display}</Text>;
}
