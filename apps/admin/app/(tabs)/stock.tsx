import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, View, Text, RefreshControl, Pressable, Modal } from 'react-native';
import { AppShell, ScreenHeader } from '@/components/layout/AppShell';
import { GoldButton } from '@/components/ui/GoldButton';
import { GoldCard } from '@/components/ui/GoldCard';
import { GoldInput } from '@/components/ui/GoldInput';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { importStockCsv, listStock, patchStock, patchTyrePrice } from '@/lib/api/stock';
import { setStockFastFit } from '@/lib/api/admin-efficiency';
import type { StockItem } from '@/types/stock';
import { ApiError } from '@/lib/api/client';

function StockRow({
  item,
  onEdit,
  onToggleFastFit,
}: {
  item: StockItem;
  onEdit: (item: StockItem) => void;
  onToggleFastFit: (item: StockItem, next: boolean) => Promise<void>;
}): React.JSX.Element {
  const tag =
    item.availability === 'in_stock'
      ? 'bg-success/30 text-success'
      : item.availability === 'low_stock'
        ? 'bg-warning/30 text-warning'
        : 'bg-danger/30 text-danger';
  return (
    <Pressable onPress={() => onEdit(item)}>
      <GoldCard className="mb-3">
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="text-text font-semibold">
              {item.brand} {item.model}
            </Text>
            <Text className="text-text-muted text-xs">
              {item.sizeLabel} · {item.tier} · {item.sku}
            </Text>
          </View>
          <View className={`px-2 py-0.5 rounded-md ${tag.split(' ')[0] ?? ''}`}>
            <Text className={`text-xs font-semibold ${tag.split(' ')[1] ?? ''}`}>
              {item.availability}
            </Text>
          </View>
        </View>
        <Text className="text-text-muted text-sm mt-2">
          Qty {item.quantityAvailable} · low ≤ {item.lowStockThreshold} · reserved {item.reservedQuantity}
        </Text>
        <Text className="text-gold text-sm font-semibold mt-1">
          £{item.basePriceGbp.toFixed(2)} per tyre
        </Text>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            void onToggleFastFit(item, !item.fastFitAvailable);
          }}
          hitSlop={8}
          className={`mt-2 self-start rounded-full px-3 py-1 border ${
            item.fastFitAvailable ? 'bg-gold border-gold' : 'border-border bg-surfaceMuted'
          }`}
        >
          <Text className={`text-[10px] font-semibold ${item.fastFitAvailable ? 'text-canvas' : 'text-text-muted'}`}>
            {item.fastFitAvailable ? '✓ Fast-fit available' : 'Mark as fast-fit'}
          </Text>
        </Pressable>
      </GoldCard>
    </Pressable>
  );
}

export default function StockScreen(): React.JSX.Element {
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<StockItem | null>(null);
  const [qty, setQty] = useState('0');
  const [low, setLow] = useState('0');
  const [reserved, setReserved] = useState('0');
  const [priceGbp, setPriceGbp] = useState('0');
  const [saving, setSaving] = useState(false);

  const [csvOpen, setCsvOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvResult, setCsvResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await listStock({ limit: 100 });
      setItems(res.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load stock');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = (item: StockItem): void => {
    setEditing(item);
    setQty(String(item.quantityAvailable));
    setLow(String(item.lowStockThreshold));
    setReserved(String(item.reservedQuantity));
    setPriceGbp(item.basePriceGbp.toFixed(2));
  };

  const save = async (): Promise<void> => {
    if (!editing) return;
    setSaving(true);
    try {
      const newPrice = Number(priceGbp);
      const priceValid = Number.isFinite(newPrice) && newPrice > 0;
      const priceChanged = priceValid && Math.abs(newPrice - editing.basePriceGbp) >= 0.005;
      await patchStock(editing.stockId, {
        quantityAvailable: Number(qty),
        lowStockThreshold: Number(low),
        reservedQuantity: Number(reserved),
      });
      if (priceChanged) {
        await patchTyrePrice(editing.tyreId, Number(newPrice.toFixed(2)));
      }
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const runImport = async (): Promise<void> => {
    setCsvResult(null);
    try {
      const res = await importStockCsv(csvText);
      setCsvResult(`Updated: ${res.updated}, skipped: ${res.skipped}`);
      await load();
    } catch (e) {
      setCsvResult(e instanceof ApiError ? e.message : 'Import failed');
    }
  };

  const onToggleFastFit = useCallback(
    async (item: StockItem, next: boolean) => {
      // Optimistic update
      setItems((prev) =>
        prev.map((it) => (it.stockId === item.stockId ? { ...it, fastFitAvailable: next } : it)),
      );
      try {
        await setStockFastFit(item.stockId, next);
      } catch (e) {
        setItems((prev) =>
          prev.map((it) =>
            it.stockId === item.stockId ? { ...it, fastFitAvailable: !next } : it,
          ),
        );
        setError(e instanceof ApiError ? e.message : 'Could not update fast-fit');
      }
    },
    [],
  );

  if (loading) {
    return (
      <AppShell>
        <ScreenHeader title="Stock" />
        <LoadingState />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <ScreenHeader
        title="Stock"
        right={
          <Pressable onPress={() => setCsvOpen(true)}>
            <Text className="text-gold font-semibold">CSV import</Text>
          </Pressable>
        }
      />
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState message="No stock items yet. Use ‘CSV import’ above to load your tyre catalogue." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(s) => s.stockId}
          renderItem={({ item }) => (
            <StockRow item={item} onEdit={openEdit} onToggleFastFit={onToggleFastFit} />
          )}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
              tintColor="#E30613"
            />
          }
        />
      )}

      <Modal
        visible={!!editing}
        animationType="slide"
        transparent
        onRequestClose={() => setEditing(null)}
      >
        <View className="flex-1 bg-canvas/80 justify-end">
          <View className="bg-surface p-4 border-t border-border">
            <Text className="text-text font-semibold mb-3">
              Adjust {editing?.brand} {editing?.model}
            </Text>
            <GoldInput label="Quantity available" keyboardType="number-pad" value={qty} onChangeText={setQty} />
            <View className="h-2" />
            <GoldInput label="Low stock threshold" keyboardType="number-pad" value={low} onChangeText={setLow} />
            <View className="h-2" />
            <GoldInput label="Reserved" keyboardType="number-pad" value={reserved} onChangeText={setReserved} />
            <View className="h-2" />
            <GoldInput
              label="Base price (£ per tyre)"
              keyboardType="decimal-pad"
              value={priceGbp}
              onChangeText={setPriceGbp}
            />
            <View className="h-3" />
            <GoldButton label="Save" onPress={save} loading={saving} />
            <View className="h-2" />
            <GoldButton label="Cancel" variant="secondary" onPress={() => setEditing(null)} />
          </View>
        </View>
      </Modal>

      <Modal visible={csvOpen} animationType="slide" transparent onRequestClose={() => setCsvOpen(false)}>
        <View className="flex-1 bg-canvas/80 justify-end">
          <View className="bg-surface p-4 border-t border-border">
            <Text className="text-text font-semibold mb-2">CSV import</Text>
            <Text className="text-text-muted text-xs mb-2">
              Header: sku,quantityAvailable,lowStockThreshold (last optional)
            </Text>
            <GoldInput
              value={csvText}
              onChangeText={setCsvText}
              multiline
              placeholder="sku,quantityAvailable,lowStockThreshold"
              className="h-40"
            />
            {csvResult ? <Text className="text-text-muted mt-2">{csvResult}</Text> : null}
            <View className="h-3" />
            <GoldButton label="Import" onPress={runImport} />
            <View className="h-2" />
            <GoldButton label="Close" variant="secondary" onPress={() => setCsvOpen(false)} />
          </View>
        </View>
      </Modal>
    </AppShell>
  );
}
