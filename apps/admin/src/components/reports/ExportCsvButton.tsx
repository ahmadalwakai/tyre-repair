import React, { useState } from 'react';
import { Alert } from 'react-native';
import { AdminButton } from '@/components/ui/AdminButton';
import { AdminIcon } from '@/components/ui/AdminIcon';
import { useToast } from '@/components/ui/Toast';
import { exportReport, type ReportExportKind } from '@/lib/api/reports-export';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

interface ExportCsvButtonProps {
  kind: ReportExportKind;
  label?: string;
}

export function ExportCsvButton({
  kind,
  label = 'Export CSV',
}: ExportCsvButtonProps): React.JSX.Element {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const { online } = useNetworkStatus();

  const onPress = async (): Promise<void> => {
    if (!online) {
      Alert.alert('You are offline', 'Connect to the internet to export reports.');
      return;
    }
    setBusy(true);
    try {
      const res = await exportReport(kind);
      if (res.webDownloadHandled) {
        toast.success('CSV downloaded');
      } else {
        toast.success('CSV ready to share');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminButton
      label={label}
      variant="secondary"
      size="sm"
      loading={busy}
      onPress={onPress}
      iconLeft={<AdminIcon name="export" size={16} color="#E30613" />}
    />
  );
}
