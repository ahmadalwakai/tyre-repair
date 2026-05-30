import React from 'react';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

interface BrandLogoProps {
  size?: number;
  /** Show wordmark under the badge. */
  showWordmark?: boolean;
}

/**
 * Brand mark for TyreRepair UK — drawn in red.
 * Pure SVG so it scales to any size and never depends on the
 * legacy gold PNG.
 */
export function BrandLogo({ size = 160, showWordmark = false }: BrandLogoProps): React.JSX.Element {
  const W = 200;
  const H = showWordmark ? 240 : 200;
  const cx = W / 2;
  const cy = 100;
  const r = 92;

  return (
    <Svg width={size} height={(size * H) / W} viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        <LinearGradient id="rim" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FF3D4D" />
          <Stop offset="1" stopColor="#B00510" />
        </LinearGradient>
        <LinearGradient id="treadShine" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FF6B7A" stopOpacity="0.9" />
          <Stop offset="1" stopColor="#E30613" stopOpacity="1" />
        </LinearGradient>
      </Defs>

      {/* outer glow ring */}
      <Circle cx={cx} cy={cy} r={r + 4} fill="none" stroke="#E30613" strokeOpacity="0.25" strokeWidth="2" />
      {/* outer ring */}
      <Circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#rim)" strokeWidth="6" />

      {/* tyre body */}
      <Circle cx={cx} cy={cy} r={r - 12} fill="#16060A" stroke="#2A0A10" strokeWidth="1" />

      {/* tread blocks around the ring */}
      <G>
        {Array.from({ length: 16 }).map((_, i) => {
          const a = (i / 16) * Math.PI * 2;
          const x = cx + Math.cos(a) * (r - 6);
          const y = cy + Math.sin(a) * (r - 6);
          const rot = (a * 180) / Math.PI + 90;
          return (
            <Rect
              key={i}
              x={x - 5}
              y={y - 9}
              width={10}
              height={14}
              rx={2}
              fill="url(#treadShine)"
              transform={`rotate(${rot} ${x} ${y})`}
            />
          );
        })}
      </G>

      {/* hub */}
      <Circle cx={cx} cy={cy} r={r - 38} fill="#0B0B0F" stroke="#E30613" strokeWidth="2" />

      {/* spokes (5) */}
      <G stroke="#E30613" strokeWidth="3" strokeLinecap="round">
        {Array.from({ length: 5 }).map((_, i) => {
          const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
          const x1 = cx + Math.cos(a) * 8;
          const y1 = cy + Math.sin(a) * 8;
          const x2 = cx + Math.cos(a) * (r - 42);
          const y2 = cy + Math.sin(a) * (r - 42);
          return <Path key={i} d={`M${x1} ${y1} L${x2} ${y2}`} />;
        })}
      </G>

      {/* center cap */}
      <Circle cx={cx} cy={cy} r={10} fill="#E30613" />
      <Circle cx={cx} cy={cy} r={4} fill="#FFD9DC" />

      {/* "24/7" badge */}
      <G>
        <Rect x={cx - 26} y={cy + 28} width={52} height={20} rx={10} fill="#E30613" />
        <SvgText
          x={cx}
          y={cy + 42}
          fontSize="12"
          fontWeight="bold"
          fill="#FFFFFF"
          textAnchor="middle"
        >
          24/7
        </SvgText>
      </G>

      {showWordmark ? (
        <G>
          <SvgText
            x={cx}
            y={H - 24}
            fontSize="22"
            fontWeight="bold"
            fill="#FFFFFF"
            textAnchor="middle"
            letterSpacing="2"
          >
            TYRE
            <SvgText fill="#E30613">REPAIR</SvgText>
          </SvgText>
          <SvgText
            x={cx}
            y={H - 6}
            fontSize="10"
            fill="#9CA3AF"
            textAnchor="middle"
            letterSpacing="6"
          >
            UK · ADMIN
          </SvgText>
        </G>
      ) : null}
    </Svg>
  );
}
