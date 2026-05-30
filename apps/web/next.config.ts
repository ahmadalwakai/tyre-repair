import type { NextConfig } from 'next';

/**
 * Content Security Policy.
 *
 * Shipped initially as **Report-Only** so a misconfigured directive cannot
 * silently break Stripe Payment Element, Mapbox GL, or Pusher websockets in
 * production. Violations surface in the browser console and (optionally) at
 * a reporting endpoint. Once the report stream is quiet for a release cycle,
 * promote the header name to `Content-Security-Policy` (without `-Report-Only`).
 *
 * Allow-list rationale:
 * - Stripe   : https://js.stripe.com (script + frame), https://api.stripe.com
 *              + https://m.stripe.network (connect, used by Radar fingerprint).
 * - Mapbox   : https://api.mapbox.com (script/style/img/connect),
 *              https://events.mapbox.com (telemetry connect), blob: workers.
 * - Pusher   : wss://ws-eu.pusher.com + https://sockjs-eu.pusher.com
 *              (cluster is `eu` per realtime/server.ts).
 * - Self     : everything else served from our origin.
 *
 * `'unsafe-inline'` is required on style-src because Chakra UI v3 (Emotion)
 * injects style tags at runtime; replacing it with nonces would need an
 * Emotion CacheProvider rewrite and is tracked separately.
 *
 * `'unsafe-inline'` on script-src is required because the Next.js App Router
 * emits inline bootstrap scripts. Strict-dynamic + per-request nonces would
 * be the next iteration; for now Report-Only keeps the surface visible
 * without sacrificing functionality.
 */
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self' https://api.stripe.com",
  "frame-ancestors 'self'",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
  "worker-src 'self' blob:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://api.mapbox.com",
  "script-src-elem 'self' 'unsafe-inline' https://js.stripe.com https://api.mapbox.com",
  "style-src 'self' 'unsafe-inline' https://api.mapbox.com",
  "img-src 'self' data: blob: https://api.mapbox.com https://*.stripe.com https://images.unsplash.com",
  "font-src 'self' data:",
  "connect-src 'self' https://api.stripe.com https://m.stripe.network https://api.mapbox.com https://events.mapbox.com wss://ws-eu.pusher.com https://sockjs-eu.pusher.com",
  "manifest-src 'self'",
  'upgrade-insecure-requests',
].join('; ');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@tyrerepair/design-tokens', '@tyrerepair/db', '@tyrerepair/realtime'],
  experimental: {
    optimizePackageImports: ['@chakra-ui/react', 'framer-motion', 'lucide-react'],
  },
  images: {
    // AVIF first (best compression, ~30% smaller than WebP), WebP fallback,
    // Next.js falls back to original format for browsers that support neither.
    formats: ['image/avif', 'image/webp'],
    // 31 days — optimised variants can be cached aggressively because the
    // Next.js loader busts the URL on any source change.
    minimumCacheTTL: 60 * 60 * 24 * 31,
    remotePatterns: [
      { protocol: 'https', hostname: 'api.mapbox.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  poweredByHeader: false,
  compress: true,
  // Security and SEO trust headers. These are part of Lighthouse Best
  // Practices and contribute indirectly to Google's quality signals.
  // CSP is shipped in Report-Only mode (see CSP_DIRECTIVES above) so that
  // any misconfiguration involving Stripe Payment Element, Mapbox GL, or
  // Pusher websockets surfaces as a report instead of breaking checkout.
  async headers() {
    const baseHeaders = [
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      // No camera/microphone access; geolocation only on same-origin for the
      // public quote flow. Adjust if a new browser API is adopted.
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(self), browsing-topics=(), interest-cohort=()',
      },
      // Belt-and-braces: deny rendering inside an iframe to defeat clickjacking
      // attempts that would proxy our checkout. Stripe Element runs in its own
      // top-level iframe; this header only affects pages we serve.
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      // Report-Only CSP. Promote to `Content-Security-Policy` once reports
      // are clean. Never enforce blindly — would break Stripe/Mapbox/Pusher.
      { key: 'Content-Security-Policy-Report-Only', value: CSP_DIRECTIVES },
    ];
    return [
      {
        // Apply security headers to every HTML route.
        source: '/:path*',
        headers: baseHeaders,
      },
    ];
  },
};

export default nextConfig;

