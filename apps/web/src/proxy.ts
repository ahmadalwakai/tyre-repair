import { NextResponse, type NextRequest } from 'next/server';

const ALLOWED_ORIGINS = new Set<string>([
  'http://localhost:8081',
  'http://localhost:19006',
  'http://localhost:3000',
]);

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  // Allow LAN origins on Expo dev ports during development.
  return /^http:\/\/(?:127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):(?:8081|19006|3000)$/.test(
    origin,
  );
}

function applyCorsHeaders(response: NextResponse, origin: string): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Vary', 'Origin');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  );
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With',
  );
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}

export function proxy(request: NextRequest): NextResponse {
  const origin = request.headers.get('origin');
  const allowed = isAllowedOrigin(origin);

  if (request.method === 'OPTIONS') {
    const preflight = new NextResponse(null, { status: 204 });
    if (allowed && origin) applyCorsHeaders(preflight, origin);
    // API responses must never be indexed by search engines.
    preflight.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return preflight;
  }

  const response = NextResponse.next();
  if (allowed && origin) applyCorsHeaders(response, origin);
  // Belt-and-braces: even with `robots.txt` disallow, some crawlers may hit
  // `/api/*` directly. The header guarantees no API JSON is indexed.
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
