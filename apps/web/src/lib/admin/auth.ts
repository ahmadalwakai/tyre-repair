import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { db, schema, eq } from '@tyrerepair/db';

export type AdminRole = 'owner' | 'admin' | 'dispatcher' | 'operator' | 'viewer';

export interface AdminAuthContext {
  adminId: string;
  email: string;
  fullName: string;
  role: AdminRole;
}

export interface SignAdminTokenInput {
  adminId: string;
  email: string;
  role: AdminRole;
  ttlSeconds?: number;
}

export class AdminAuthError extends Error {
  public readonly status: number;
  public constructor(message: string, status: number) {
    super(message);
    this.name = 'AdminAuthError';
    this.status = status;
  }
}

const DEFAULT_TTL_DAYS = 30;

function getSecretKey(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new AdminAuthError('Server misconfigured', 500);
  }
  return new TextEncoder().encode(secret);
}

function readTtlSeconds(): number {
  const raw = process.env.ADMIN_SESSION_TTL_DAYS;
  const days = raw ? Number(raw) : DEFAULT_TTL_DAYS;
  const valid = Number.isFinite(days) && days > 0 ? days : DEFAULT_TTL_DAYS;
  return Math.floor(valid * 24 * 60 * 60);
}

export async function signAdminToken(input: SignAdminTokenInput): Promise<string> {
  const ttl = typeof input.ttlSeconds === 'number' && input.ttlSeconds > 0
    ? input.ttlSeconds
    : readTtlSeconds();
  const now = Math.floor(Date.now() / 1000);
  const payload: JWTPayload = {
    adminId: input.adminId,
    email: input.email,
    role: input.role,
  };
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(now + ttl)
    .setSubject(input.adminId)
    .sign(getSecretKey());
}

interface DecodedAdminPayload {
  adminId: string;
  email: string;
  role: AdminRole;
}

function isAdminRole(value: unknown): value is AdminRole {
  return (
    value === 'owner' ||
    value === 'admin' ||
    value === 'dispatcher' ||
    value === 'operator' ||
    value === 'viewer'
  );
}

function decodePayload(payload: JWTPayload): DecodedAdminPayload {
  const adminId = payload['adminId'];
  const email = payload['email'];
  const role = payload['role'];
  if (typeof adminId !== 'string' || typeof email !== 'string' || !isAdminRole(role)) {
    throw new AdminAuthError('Invalid token payload', 401);
  }
  return { adminId, email, role };
}

export async function verifyAdminToken(token: string): Promise<AdminAuthContext> {
  let result;
  try {
    result = await jwtVerify(token, getSecretKey(), { algorithms: ['HS256'] });
  } catch {
    throw new AdminAuthError('Invalid or expired token', 401);
  }
  const decoded = decodePayload(result.payload);
  const rows = await db
    .select({
      id: schema.admins.id,
      email: schema.admins.email,
      fullName: schema.admins.fullName,
      role: schema.admins.role,
      isActive: schema.admins.isActive,
    })
    .from(schema.admins)
    .where(eq(schema.admins.id, decoded.adminId))
    .limit(1);
  const admin = rows[0];
  if (!admin) {
    throw new AdminAuthError('Admin not found', 404);
  }
  if (!admin.isActive) {
    throw new AdminAuthError('Account inactive', 403);
  }
  return {
    adminId: admin.id,
    email: admin.email,
    fullName: admin.fullName,
    role: admin.role as AdminRole,
  };
}

function extractBearer(req: Request): string | null {
  const header = req.headers.get('authorization') ?? req.headers.get('Authorization');
  if (!header) return null;
  const trimmed = header.trim();
  if (!trimmed.toLowerCase().startsWith('bearer ')) return null;
  const token = trimmed.slice(7).trim();
  return token.length > 0 ? token : null;
}

export async function requireAdmin(req: Request): Promise<AdminAuthContext> {
  const token = extractBearer(req);
  if (!token) {
    throw new AdminAuthError('Missing bearer token', 401);
  }
  return await verifyAdminToken(token);
}

export function adminAuthErrorResponse(err: unknown): { status: number; body: { error: string } } {
  if (err instanceof AdminAuthError) {
    return { status: err.status, body: { error: err.message } };
  }
  return { status: 401, body: { error: 'Unauthorized' } };
}
