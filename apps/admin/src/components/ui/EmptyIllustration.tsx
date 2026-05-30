import React from 'react';
import Svg, { Circle, Path, G, Defs, LinearGradient, Stop } from 'react-native-svg';

/**
 * Lightweight inline SVG illustrations for empty / success / error states.
 * No external Lottie / image asset dependency — keeps the bundle small and
 * the visuals on-brand (gold + red on dark canvas).
 */

export type EmptyIllustrationKind =
  | 'inbox'
  | 'bookings'
  | 'search'
  | 'success'
  | 'offline'
  | 'tyre'
  | 'pulse';

const GOLD = '#D4AF37';
const GOLD_DIM = '#7A6322';
const RED = '#E30613';
const MUTED = '#3A3A44';

interface Props {
  kind?: EmptyIllustrationKind;
  size?: number;
}

export function EmptyIllustration({ kind = 'inbox', size = 128 }: Props): React.JSX.Element {
  switch (kind) {
    case 'bookings':
      return (
        <Svg width={size} height={size} viewBox="0 0 128 128">
          <Defs>
            <LinearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={GOLD} stopOpacity="0.25" />
              <Stop offset="1" stopColor={GOLD} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Circle cx="64" cy="64" r="58" fill="url(#g1)" />
          <Path
            d="M32 44h64v52a4 4 0 0 1-4 4H36a4 4 0 0 1-4-4V44z"
            fill={MUTED}
            stroke={GOLD}
            strokeWidth="1.5"
          />
          <Path d="M32 44h64v12H32z" fill={GOLD_DIM} />
          <Path d="M44 34v16M84 34v16" stroke={GOLD} strokeWidth="3" strokeLinecap="round" />
          <Path d="M44 70h40M44 82h28" stroke={GOLD} strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );
    case 'search':
      return (
        <Svg width={size} height={size} viewBox="0 0 128 128">
          <Circle cx="64" cy="64" r="58" fill={MUTED} fillOpacity="0.4" />
          <Circle cx="56" cy="56" r="22" stroke={GOLD} strokeWidth="3" fill="none" />
          <Path d="M74 74l16 16" stroke={GOLD} strokeWidth="4" strokeLinecap="round" />
        </Svg>
      );
    case 'success':
      return (
        <Svg width={size} height={size} viewBox="0 0 128 128">
          <Circle cx="64" cy="64" r="56" fill={GOLD} fillOpacity="0.18" />
          <Circle cx="64" cy="64" r="40" stroke={GOLD} strokeWidth="3" fill="none" />
          <Path
            d="M46 66l12 12 24-26"
            stroke={GOLD}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      );
    case 'offline':
      return (
        <Svg width={size} height={size} viewBox="0 0 128 128">
          <Circle cx="64" cy="64" r="58" fill={RED} fillOpacity="0.1" />
          <Path
            d="M28 56c20-20 52-20 72 0M40 70c14-14 34-14 48 0M52 84c8-8 16-8 24 0"
            stroke={RED}
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <Circle cx="64" cy="96" r="4" fill={RED} />
          <Path d="M22 22l84 84" stroke={RED} strokeWidth="4" strokeLinecap="round" />
        </Svg>
      );
    case 'tyre':
      return (
        <Svg width={size} height={size} viewBox="0 0 128 128">
          <Circle cx="64" cy="64" r="50" stroke={GOLD} strokeWidth="6" fill={MUTED} />
          <Circle cx="64" cy="64" r="22" stroke={GOLD} strokeWidth="4" fill="#0B0B0F" />
          <G stroke={GOLD} strokeWidth="3" strokeLinecap="round">
            <Path d="M64 14v18M64 96v18M14 64h18M96 64h18M30 30l12 12M86 86l12 12M98 30L86 42M30 98l12-12" />
          </G>
        </Svg>
      );
    case 'pulse':
      return (
        <Svg width={size} height={size} viewBox="0 0 128 128">
          <Circle cx="64" cy="64" r="56" fill={GOLD} fillOpacity="0.08" />
          <Circle cx="64" cy="64" r="42" stroke={GOLD} strokeOpacity="0.5" strokeWidth="2" fill="none" />
          <Circle cx="64" cy="64" r="28" stroke={GOLD} strokeWidth="2" fill="none" />
          <Circle cx="64" cy="64" r="10" fill={GOLD} />
        </Svg>
      );
    case 'inbox':
    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 128 128">
          <Defs>
            <LinearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={GOLD} stopOpacity="0.25" />
              <Stop offset="1" stopColor={GOLD} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Circle cx="64" cy="64" r="58" fill="url(#g2)" />
          <Path
            d="M24 56l16-26h48l16 26v40a4 4 0 0 1-4 4H28a4 4 0 0 1-4-4V56z"
            fill={MUTED}
            stroke={GOLD}
            strokeWidth="1.5"
          />
          <Path
            d="M24 56h28l4 8h16l4-8h28"
            fill="none"
            stroke={GOLD}
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </Svg>
      );
  }
}
