import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

/**
 * Hand-tuned 24px stroke icon set for the admin app.
 *
 * Why not @expo/vector-icons or lucide-react-native?
 *  - Keeps the bundle small (we already ship react-native-svg).
 *  - Stroke width, corners, and proportions are tuned to read well at 22–28px
 *    on a dark gold-accent background, which the third-party packs do not
 *    guarantee out of the box.
 *
 * All icons:
 *  - share viewBox 24x24
 *  - stroke-only, no fills (so a single `color` prop tints them perfectly)
 *  - rounded line caps + joins for the calm "premium" feel used elsewhere
 */

export type AdminIconName =
  | 'bolt'
  | 'list'
  | 'card'
  | 'pound'
  | 'phone'
  | 'bell'
  | 'tyre'
  | 'search'
  | 'chevron-left'
  | 'export';

export interface AdminIconProps {
  name: AdminIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function AdminIcon({
  name,
  size = 22,
  color = '#D4AF37',
  strokeWidth = 1.75,
}: AdminIconProps): React.JSX.Element {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
  };

  switch (name) {
    case 'bolt':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" {...common} />
        </Svg>
      );

    case 'list':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M9 6h11" {...common} />
          <Path d="M9 12h11" {...common} />
          <Path d="M9 18h11" {...common} />
          <Circle cx={4.5} cy={6} r={1.25} {...common} />
          <Circle cx={4.5} cy={12} r={1.25} {...common} />
          <Circle cx={4.5} cy={18} r={1.25} {...common} />
        </Svg>
      );

    case 'card':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x={2.5} y={5} width={19} height={14} rx={2.5} {...common} />
          <Path d="M2.5 10h19" {...common} />
          <Path d="M6 15.5h4" {...common} />
        </Svg>
      );

    case 'pound':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M16.5 6.5a4 4 0 0 0-7 2.5v3.5H7" {...common} />
          <Path d="M7 18h10" {...common} />
          <Path d="M9.5 12.5h6" {...common} />
          <Path d="M9.5 9v6.5c0 1-.5 1.8-1.5 2.5" {...common} />
        </Svg>
      );

    case 'phone':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M5 4.5h3l1.8 4.2-2.2 1.3a12 12 0 0 0 6.4 6.4l1.3-2.2 4.2 1.8v3a2 2 0 0 1-2.2 2A17 17 0 0 1 3 6.7 2 2 0 0 1 5 4.5Z"
            {...common}
          />
        </Svg>
      );

    case 'bell':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2H4.5L6 16.5Z"
            {...common}
          />
          <Path d="M10 20.5a2 2 0 0 0 4 0" {...common} />
        </Svg>
      );

    case 'tyre':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={9} {...common} />
          <Circle cx={12} cy={12} r={3.25} {...common} />
          <Path d="M12 3v3.5" {...common} />
          <Path d="M12 17.5V21" {...common} />
          <Path d="M3 12h3.5" {...common} />
          <Path d="M17.5 12H21" {...common} />
        </Svg>
      );

    case 'search':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={11} cy={11} r={6.5} {...common} />
          <Path d="m20 20-3.6-3.6" {...common} />
        </Svg>
      );

    case 'chevron-left':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M14.5 5.5 8 12l6.5 6.5" {...common} />
        </Svg>
      );

    case 'export':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 4v11" {...common} />
          <Path d="m7.5 8.5 4.5-4.5 4.5 4.5" {...common} />
          <Path d="M5 16v3a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-3" {...common} />
        </Svg>
      );
  }
}
