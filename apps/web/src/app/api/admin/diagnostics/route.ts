/**
 * Admin Stability & Field Operations Pack — Part 1
 * GET /api/admin/diagnostics
 *
 * Returns SAFE booleans + identity for the admin app diagnostics screen.
 * Never exposes secret values, raw env strings, or JWT contents.
 */
import { NextResponse } from 'next/server';
import { db, sql } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { hasPermission, permissionsForRole } from '@/lib/admin/permissions';
import { getStorageConfigStatus } from '@/lib/admin/storage-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface DiagnosticsResponse {
  ok: boolean;
  timestamp: string;
  service: string;
  version: string;
  admin: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    permissions: string[];
  };
  database: { ok: boolean };
  realtime: {
    pusherKeyPresent: boolean;
    pusherSecretPresent: boolean;
    pusherClusterPresent: boolean;
    pusherAppIdPresent: boolean;
    publicKeyPresent: boolean;
    publicClusterPresent: boolean;
  };
  push: {
    expoAccessTokenPresent: boolean;
    defaultSoundConfigured: boolean;
  };
  storage: {
    configured: boolean;
    provider: string;
    missing: string[];
  };
  webEnv: {
    siteUrlPresent: boolean;
    adminJwtSecretPresent: boolean;
  };
}

async function checkDb(): Promise<boolean> {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

export async function GET(req: Request): Promise<NextResponse> {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  // Diagnostics is generally low-risk read; gate behind permission anyway
  // so viewer/operator can still inspect their own connection issues.
  if (!hasPermission(admin, 'diagnostics.read')) {
    return NextResponse.json({ error: 'Permission denied.' }, { status: 403 });
  }

  const databaseOk = await checkDb();
  const storage = getStorageConfigStatus();

  const response: DiagnosticsResponse = {
    ok: databaseOk,
    timestamp: new Date().toISOString(),
    service: 'tyrerepair-web',
    version: process.env['npm_package_version'] ?? '0.0.1',
    admin: {
      id: admin.adminId,
      email: admin.email,
      fullName: admin.fullName,
      role: admin.role,
      permissions: permissionsForRole(admin.role),
    },
    database: { ok: databaseOk },
    realtime: {
      pusherAppIdPresent: Boolean(process.env['PUSHER_APP_ID']),
      pusherKeyPresent: Boolean(process.env['PUSHER_KEY']),
      pusherSecretPresent: Boolean(process.env['PUSHER_SECRET']),
      pusherClusterPresent: Boolean(process.env['PUSHER_CLUSTER']),
      publicKeyPresent: Boolean(process.env['NEXT_PUBLIC_PUSHER_KEY']),
      publicClusterPresent: Boolean(process.env['NEXT_PUBLIC_PUSHER_CLUSTER']),
    },
    push: {
      expoAccessTokenPresent: Boolean(process.env['EXPO_ACCESS_TOKEN']),
      defaultSoundConfigured: Boolean(process.env['ADMIN_NOTIFICATION_DEFAULT_SOUND']),
    },
    storage: {
      configured: storage.configured,
      provider: storage.provider,
      missing: storage.missing,
    },
    webEnv: {
      siteUrlPresent: Boolean(process.env['NEXT_PUBLIC_SITE_URL']),
      adminJwtSecretPresent: Boolean(process.env['ADMIN_JWT_SECRET']),
    },
  };

  return NextResponse.json(response, { status: 200 });
}
