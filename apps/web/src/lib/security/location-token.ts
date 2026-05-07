import { SignJWT, jwtVerify } from 'jose';

const ISSUER = 'tyrerepair-uk';
const AUDIENCE = 'location-capture';
const EXPIRY_MINUTES = 30;

export interface LocationCaptureTokenPayload {
  purpose: 'location_capture';
  method: 'sms' | 'email';
  phone?: string;
  email?: string;
  createdAt: number;
  expiresAt: number;
}

function getSecret(): Uint8Array {
  const secret =
    process.env.LOCATION_CAPTURE_SECRET ?? process.env.ADMIN_JWT_SECRET ?? '';
  if (!secret || secret.length < 16) {
    throw new Error(
      'LOCATION_CAPTURE_SECRET (or ADMIN_JWT_SECRET fallback) must be set and at least 16 characters',
    );
  }
  return new TextEncoder().encode(secret);
}

export interface CreateLocationTokenInput {
  method: 'sms' | 'email';
  phone?: string;
  email?: string;
}

export async function createLocationCaptureToken(
  input: CreateLocationTokenInput,
): Promise<{ token: string; expiresAt: Date; expiresInMinutes: number }> {
  const now = Math.floor(Date.now() / 1000);
  const expSec = now + EXPIRY_MINUTES * 60;

  const payload: Record<string, unknown> = {
    purpose: 'location_capture',
    method: input.method,
    createdAt: now,
    expiresAt: expSec,
  };
  if (input.phone) payload.phone = input.phone;
  if (input.email) payload.email = input.email;

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(expSec)
    .sign(getSecret());

  return {
    token,
    expiresAt: new Date(expSec * 1000),
    expiresInMinutes: EXPIRY_MINUTES,
  };
}

export type VerifyResult =
  | { ok: true; payload: LocationCaptureTokenPayload }
  | { ok: false; reason: 'expired' | 'invalid' };

export async function verifyLocationCaptureToken(token: string): Promise<VerifyResult> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (payload.purpose !== 'location_capture') return { ok: false, reason: 'invalid' };
    if (payload.method !== 'sms' && payload.method !== 'email') {
      return { ok: false, reason: 'invalid' };
    }
    const result: LocationCaptureTokenPayload = {
      purpose: 'location_capture',
      method: payload.method,
      createdAt:
        typeof payload.createdAt === 'number' ? payload.createdAt : Math.floor(Date.now() / 1000),
      expiresAt:
        typeof payload.expiresAt === 'number' ? payload.expiresAt : Math.floor(Date.now() / 1000),
    };
    if (typeof payload.phone === 'string') result.phone = payload.phone;
    if (typeof payload.email === 'string') result.email = payload.email;
    return { ok: true, payload: result };
  } catch (err) {
    const msg = err instanceof Error ? err.message.toLowerCase() : '';
    if (msg.includes('exp') || msg.includes('expired')) return { ok: false, reason: 'expired' };
    return { ok: false, reason: 'invalid' };
  }
}

export const LOCATION_TOKEN_EXPIRY_MINUTES = EXPIRY_MINUTES;
