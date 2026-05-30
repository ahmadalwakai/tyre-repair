/**
 * One-off: add or update an admin account.
 * Usage:
 *   ADMIN_EMAIL_NEW=foo@bar.com ADMIN_PASSWORD_NEW='secret' ADMIN_NAME_NEW='Foo' \
 *     tsx packages/db/scripts/add-admin.ts
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../src/client';
import { admins } from '../src/schema';

async function main(): Promise<void> {
  const email = process.env.ADMIN_EMAIL_NEW;
  const password = process.env.ADMIN_PASSWORD_NEW;
  const fullName = process.env.ADMIN_NAME_NEW ?? 'TyreRepair Admin';
  if (!email || !password) {
    throw new Error('ADMIN_EMAIL_NEW and ADMIN_PASSWORD_NEW env vars are required');
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await db.select().from(admins).where(eq(admins.email, email)).limit(1);
  if (existing.length === 0) {
    await db.insert(admins).values({
      email,
      passwordHash,
      fullName,
      role: 'owner',
      isActive: true,
    });
    console.log(`Created admin ${email}`);
  } else {
    await db
      .update(admins)
      .set({ passwordHash, role: 'owner', isActive: true, updatedAt: new Date() })
      .where(eq(admins.email, email));
    console.log(`Updated admin ${email} (password reset, role=owner, active=true)`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
