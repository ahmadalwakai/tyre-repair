import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActionSheetIOS, Image, Linking, Platform, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AdminButton } from '@/components/ui/AdminButton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { useToast } from '@/components/ui/Toast';
import {
  deleteBookingAttachment,
  listBookingAttachments,
  uploadBookingAttachment,
  type BookingAttachmentRecord,
  type ListBookingAttachmentsResponse,
} from '@/lib/api/attachments';

/**
 * Admin Stability & Field Operations Pack — Part 3
 *
 * Admin-only attachments panel for a booking. Lists existing photos,
 * captures new ones via camera or gallery (when storage is configured),
 * and supports delete (when permitted).
 *
 * Customer-facing pages must never render this component.
 */
export interface BookingAttachmentsPanelProps {
  bookingId: string;
}

type AttachmentType = BookingAttachmentRecord['type'];
const TYPE_LABELS: Record<AttachmentType, string> = {
  DAMAGE_PHOTO: 'Damage',
  TYRE_SIZE_PHOTO: 'Tyre size',
  LOCKING_NUT_PHOTO: 'Locking nut',
  AFTER_REPAIR_PHOTO: 'After repair',
  RECEIPT_PHOTO: 'Receipt',
  OTHER: 'Other',
};
const TYPE_OPTIONS: AttachmentType[] = [
  'DAMAGE_PHOTO',
  'TYRE_SIZE_PHOTO',
  'LOCKING_NUT_PHOTO',
  'AFTER_REPAIR_PHOTO',
  'RECEIPT_PHOTO',
  'OTHER',
];

export function BookingAttachmentsPanel({
  bookingId,
}: BookingAttachmentsPanelProps): React.JSX.Element {
  const [data, setData] = useState<ListBookingAttachmentsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState<AttachmentType>('DAMAGE_PHOTO');
  const toast = useToast();

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await listBookingAttachments(bookingId);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attachments');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onDelete = useCallback(
    async (item: BookingAttachmentRecord): Promise<void> => {
      setBusyId(item.id);
      try {
        await deleteBookingAttachment(bookingId, item.id);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete');
      } finally {
        setBusyId(null);
      }
    },
    [bookingId, load],
  );

  const uploadAsset = useCallback(
    async (asset: ImagePicker.ImagePickerAsset): Promise<void> => {
      setUploading(true);
      setError(null);
      try {
        const mimeType =
          asset.mimeType ?? (asset.uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');
        await uploadBookingAttachment(bookingId, {
          uri: asset.uri,
          type: selectedType,
          mimeType,
          ...(asset.fileName ? { fileName: asset.fileName } : {}),
        });
        toast.show('Photo uploaded', 'success');
        await load();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        setError(message);
        toast.show(message, 'error');
      } finally {
        setUploading(false);
      }
    },
    [bookingId, selectedType, toast, load],
  );

  const onPickFromLibrary = useCallback(async (): Promise<void> => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.show('Photo library permission denied', 'error');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      exif: false,
    });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    if (asset) await uploadAsset(asset);
  }, [toast, uploadAsset]);

  const onCapturePhoto = useCallback(async (): Promise<void> => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      toast.show('Camera permission denied', 'error');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      exif: false,
    });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    if (asset) await uploadAsset(asset);
  }, [toast, uploadAsset]);

  const onCycleType = useCallback((): void => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...TYPE_OPTIONS.map((t) => TYPE_LABELS[t]), 'Cancel'],
          cancelButtonIndex: TYPE_OPTIONS.length,
        },
        (idx) => {
          const next = TYPE_OPTIONS[idx];
          if (next) setSelectedType(next);
        },
      );
      return;
    }
    const idx = TYPE_OPTIONS.indexOf(selectedType);
    const next = TYPE_OPTIONS[(idx + 1) % TYPE_OPTIONS.length];
    if (next) setSelectedType(next);
  }, [selectedType]);

  const canCapture = useMemo<boolean>(
    () => Boolean(data?.storage.configured && data?.canUpload && !uploading),
    [data, uploading],
  );

  return (
    <AnimatedCard>
      <View className="bg-surface rounded-xl border border-border p-4 mb-3">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-text font-semibold">Attachments</Text>
          {data ? (
            <StatusBadge tone="muted" label={`${data.items.length}`} />
          ) : null}
        </View>

        {loading && !data ? (
          <Text className="text-text-muted text-xs">Loading…</Text>
        ) : null}

        {error ? (
          <Text className="text-danger text-xs mb-2">{error}</Text>
        ) : null}

        {data && !data.storage.configured ? (
          <View className="bg-warning/10 border border-warning rounded-lg p-3 mb-2">
            <Text className="text-warning text-xs font-semibold mb-1">
              Photo upload is not configured.
            </Text>
            <Text className="text-text-muted text-xs">
              An object storage provider must be configured on the server
              before photos can be uploaded. Existing attachments (if any) are
              still listed below.
            </Text>
          </View>
        ) : null}

        {data && data.storage.configured && data.canUpload ? (
          <View className="bg-surfaceMuted rounded-lg p-3 mb-2">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-text text-xs">Photo type</Text>
              <AdminButton
                label={TYPE_LABELS[selectedType]}
                variant="ghost"
                size="sm"
                onPress={onCycleType}
              />
            </View>
            <View className="flex-row">
              <View className="flex-1 mr-2">
                <AdminButton
                  label="Take photo"
                  variant="primary"
                  size="md"
                  loading={uploading}
                  disabled={!canCapture}
                  onPress={() => void onCapturePhoto()}
                />
              </View>
              <View className="flex-1">
                <AdminButton
                  label="From library"
                  variant="secondary"
                  size="md"
                  loading={uploading}
                  disabled={!canCapture}
                  onPress={() => void onPickFromLibrary()}
                />
              </View>
            </View>
            <Text className="text-text-muted text-[11px] mt-2">
              Max 5MB. JPEG, PNG, WEBP, HEIC.
            </Text>
          </View>
        ) : null}

        {data && data.items.length === 0 ? (
          <Text className="text-text-muted text-xs">No attachments yet.</Text>
        ) : null}

        {data?.items.map((item) => (
          <View
            key={item.id}
            className="flex-row items-center justify-between border-t border-border py-2"
          >
            <View className="flex-row items-center flex-1 pr-2">
              {item.mimeType.startsWith('image/') ? (
                <Image
                  source={{ uri: item.fileUrl }}
                  style={{ width: 40, height: 40, borderRadius: 6 }}
                />
              ) : (
                <View className="w-10 h-10 rounded-md bg-surfaceMuted items-center justify-center">
                  <Text className="text-text-muted text-[10px]">FILE</Text>
                </View>
              )}
              <View className="ml-3 flex-1">
                <Text className="text-text text-sm" numberOfLines={1}>
                  {item.caption || item.type.replaceAll('_', ' ').toLowerCase()}
                </Text>
                <Text className="text-text-muted text-[11px]">
                  {item.type} • {(item.sizeBytes / 1024).toFixed(0)} KB •{' '}
                  {new Date(item.createdAt).toLocaleString()}
                </Text>
              </View>
            </View>
            <View className="flex-row">
              <AdminButton
                label="Open"
                variant="ghost"
                size="sm"
                onPress={() => {
                  void Linking.openURL(item.fileUrl);
                }}
              />
              {data.canDelete ? (
                <AdminButton
                  label="Delete"
                  variant="danger"
                  size="sm"
                  loading={busyId === item.id}
                  disabled={busyId === item.id}
                  onPress={() => void onDelete(item)}
                />
              ) : null}
            </View>
          </View>
        ))}

        <View className="mt-2">
          <AdminButton
            label="Refresh"
            variant="ghost"
            size="sm"
            onPress={() => void load()}
          />
        </View>
      </View>
    </AnimatedCard>
  );
}
