/* eslint-disable react/no-inline-styles, react/forbid-dom-props */
// next/og ImageResponse requires inline styles — Tailwind/CSS classes are not supported.
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'TyreRepair UK — Mobile Tyre Fitting Across Scotland';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0A0A0A',
          color: '#FFD700',
          padding: '72px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div
            style={{
              width: '14px',
              height: '14px',
              borderRadius: '999px',
              background: '#FFD700',
              boxShadow: '0 0 32px #FFD700',
            }}
          />
          <div style={{ fontSize: 28, color: '#D4AF37', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            TyreRepair UK
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.04, color: '#F8F8F8' }}>
            Mobile Tyre Fitting
          </div>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.04, color: '#FFD700' }}>
            Across Scotland
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', color: '#B8B8B8', fontSize: 28 }}>
          <div>tyrerepair.uk</div>
          <div>0141 266 0690 · 24/7</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
