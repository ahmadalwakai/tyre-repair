import React from 'react';
import { View } from 'react-native';
import { RadarPulse } from './RadarPulse';

/**
 * Overlay wrapper that places one or two soft RadarPulse rings around the
 * top-right corner of a card to signal urgency. Pointer-events disabled so
 * it never blocks card interaction. Use for high-priority queue items.
 *
 *   <UrgentPulse active={item.severity === 'DANGER'}>
 *     <ActionRow ... />
 *   </UrgentPulse>
 */
export interface UrgentPulseProps {
  active?: boolean;
  /** Brand red by default — pass another colour for warning tone. */
  color?: string;
  size?: number;
  children: React.ReactNode;
}

export function UrgentPulse({
  active = true,
  color = '#E30613',
  size = 26,
  children,
}: UrgentPulseProps): React.JSX.Element {
  if (!active) return <>{children}</>;
  return (
    <View style={{ position: 'relative' }}>
      {children}
      <View pointerEvents="none" style={{ position: 'absolute', top: 14, right: 14 }}>
        <RadarPulse x={0} y={0} color={color} size={size} />
      </View>
    </View>
  );
}
