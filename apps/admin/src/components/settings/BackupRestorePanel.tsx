import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { GoldCard } from '@/components/ui/GoldCard';
import { GoldButton } from '@/components/ui/GoldButton';
import { exportSettingsBackup, importSettingsBackup, listBackupKeys } from '@/lib/settings/backup';
import { useToast } from '@/components/ui/Toast';

export function BackupRestorePanel(): React.JSX.Element {
  const toast = useToast();
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);
  const keys = listBackupKeys();

  async function onExport(): Promise<void> {
    setBusy('export');
    try {
      const res = await exportSettingsBackup();
      toast.show(
        res.shared ? `Backup ready: ${res.filename}` : `Saved to ${res.uri}`,
        'success',
      );
    } catch (e) {
      Alert.alert('Backup failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(null);
    }
  }

  async function onImport(): Promise<void> {
    setBusy('import');
    try {
      const res = await importSettingsBackup();
      if (res.cancelled) return;
      toast.show(`Restored ${res.imported} setting(s). Restart the app.`, 'success');
    } catch (e) {
      Alert.alert('Restore failed', e instanceof Error ? e.message : 'Invalid backup file');
    } finally {
      setBusy(null);
    }
  }

  return (
    <GoldCard className="mb-3">
      <Text className="text-text font-semibold text-base">Backup & Restore</Text>
      <Text className="text-text-dim text-xs mt-1">
        Export device-level settings to a JSON file you can share or re-import on another device.
        Auth tokens and the offline outbox are not included.
      </Text>
      <View className="mt-3 gap-2">
        <GoldButton
          label={busy === 'export' ? 'Exporting…' : 'Export settings backup'}
          onPress={onExport}
          disabled={busy !== null}
        />
        <GoldButton
          label={busy === 'import' ? 'Importing…' : 'Import settings from file'}
          onPress={onImport}
          variant="secondary"
          disabled={busy !== null}
        />
      </View>
      <Text className="text-text-dim text-[10px] mt-3">
        Included keys: {keys.join(', ')}
      </Text>
    </GoldCard>
  );
}
