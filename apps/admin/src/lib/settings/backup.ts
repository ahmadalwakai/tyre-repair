import * as SecureStore from 'expo-secure-store';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

const BACKUP_VERSION = 1 as const;

/** Keys safe to include in a backup. Excludes auth tokens and outbox. */
const BACKUP_KEYS = ['admin.sound.prefs', 'admin.quick-booking.draft'] as const;

interface BackupFile {
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  app: 'tyrerepair-admin';
  entries: Record<string, string | null>;
}

export async function exportSettingsBackup(): Promise<{
  uri: string;
  filename: string;
  shared: boolean;
}> {
  const entries: Record<string, string | null> = {};
  for (const key of BACKUP_KEYS) {
    entries[key] = await SecureStore.getItemAsync(key).catch(() => null);
  }
  const payload: BackupFile = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    app: 'tyrerepair-admin',
    entries,
  };
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `tyrerepair-admin-backup-${stamp}.json`;
  const file = new File(Paths.document, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(payload, null, 2));
  const uri = file.uri;
  let shared = false;
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/json',
      dialogTitle: 'Save admin settings backup',
      UTI: 'public.json',
    });
    shared = true;
  }
  return { uri, filename, shared };
}

export async function importSettingsBackup(): Promise<{
  imported: number;
  cancelled: boolean;
}> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return { imported: 0, cancelled: true };
  const picked = result.assets?.[0];
  if (!picked) return { imported: 0, cancelled: true };

  const raw = await new File(picked.uri).text();
  const parsed = JSON.parse(raw) as Partial<BackupFile>;
  if (parsed?.app !== 'tyrerepair-admin' || parsed.version !== BACKUP_VERSION) {
    throw new Error('Backup file is not a TyreRepair admin export.');
  }
  const entries = parsed.entries ?? {};
  let imported = 0;
  for (const key of BACKUP_KEYS) {
    const value = entries[key];
    if (typeof value === 'string') {
      await SecureStore.setItemAsync(key, value);
      imported += 1;
    } else if (value === null) {
      await SecureStore.deleteItemAsync(key).catch(() => undefined);
    }
  }
  return { imported, cancelled: false };
}

export function listBackupKeys(): readonly string[] {
  return BACKUP_KEYS;
}
