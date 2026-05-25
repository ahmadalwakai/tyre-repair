/**
 * Admin Stability & Field Operations Pack — Part 4
 * Role-based permission helpers.
 *
 * Roles (DB enum `admin_role`):
 *   - 'owner'       : full access (legacy + intended).
 *   - 'admin'       : legacy alias treated as owner-equivalent for backwards
 *                     compatibility. Existing admin accounts continue to work.
 *   - 'dispatcher'  : day-to-day operations.
 *   - 'operator'    : limited write.
 *   - 'viewer'      : read-only.
 *
 * Backend MUST enforce permissions via `requirePermission`. The admin app
 * also reads these to disable/hide buttons, but the UI alone is not trusted.
 */
import { NextResponse } from 'next/server';
import type { AdminAuthContext, AdminRole } from './auth';

export type AdminPermission =
  | 'pricing.override'
  | 'pricing.settings.write'
  | 'booking.cancel'
  | 'booking.refund'
  | 'booking.create'
  | 'booking.notes.write'
  | 'booking.attachments.upload'
  | 'booking.attachments.delete'
  | 'stock.write'
  | 'payment.send_link'
  | 'payment.send_balance_link'
  | 'reports.export'
  | 'audit.read'
  | 'admins.manage'
  | 'settings.write'
  | 'diagnostics.read';

const PERMISSIONS_BY_ROLE: Record<AdminRole, ReadonlySet<AdminPermission>> = {
  owner: new Set<AdminPermission>([
    'pricing.override',
    'pricing.settings.write',
    'booking.cancel',
    'booking.refund',
    'booking.create',
    'booking.notes.write',
    'booking.attachments.upload',
    'booking.attachments.delete',
    'stock.write',
    'payment.send_link',
    'payment.send_balance_link',
    'reports.export',
    'audit.read',
    'admins.manage',
    'settings.write',
    'diagnostics.read',
  ]),
  // Legacy 'admin' = full access (backwards compatibility for existing seed).
  admin: new Set<AdminPermission>([
    'pricing.override',
    'pricing.settings.write',
    'booking.cancel',
    'booking.refund',
    'booking.create',
    'booking.notes.write',
    'booking.attachments.upload',
    'booking.attachments.delete',
    'stock.write',
    'payment.send_link',
    'payment.send_balance_link',
    'reports.export',
    'audit.read',
    'admins.manage',
    'settings.write',
    'diagnostics.read',
  ]),
  dispatcher: new Set<AdminPermission>([
    'booking.create',
    'booking.notes.write',
    'booking.attachments.upload',
    'payment.send_link',
    'payment.send_balance_link',
    'audit.read',
    'diagnostics.read',
  ]),
  operator: new Set<AdminPermission>([
    'booking.create',
    'booking.notes.write',
    'booking.attachments.upload',
    'diagnostics.read',
  ]),
  viewer: new Set<AdminPermission>(['audit.read', 'diagnostics.read']),
};

export function hasPermission(
  admin: Pick<AdminAuthContext, 'role'>,
  permission: AdminPermission,
): boolean {
  const set = PERMISSIONS_BY_ROLE[admin.role];
  if (!set) return false;
  return set.has(permission);
}

export class AdminPermissionError extends Error {
  public readonly status = 403;
  public readonly permission: AdminPermission;
  public constructor(permission: AdminPermission) {
    super(`Permission denied: ${permission}`);
    this.name = 'AdminPermissionError';
    this.permission = permission;
  }
}

export function requirePermission(
  admin: Pick<AdminAuthContext, 'role'>,
  permission: AdminPermission,
): void {
  if (!hasPermission(admin, permission)) {
    throw new AdminPermissionError(permission);
  }
}

export function permissionsForRole(role: AdminRole): AdminPermission[] {
  const set = PERMISSIONS_BY_ROLE[role];
  return set ? Array.from(set) : [];
}

export function permissionErrorResponse(err: unknown): NextResponse | null {
  if (err instanceof AdminPermissionError) {
    return NextResponse.json(
      {
        error: 'Owner permission required.',
        code: 'permission_denied',
        permission: err.permission,
      },
      { status: 403 },
    );
  }
  return null;
}
