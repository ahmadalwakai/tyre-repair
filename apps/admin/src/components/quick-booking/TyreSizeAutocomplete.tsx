/**
 * Tyre size autocomplete backed by GET /api/admin/stock?search=.
 *
 * Shows top matches with stock badges. Selecting a row commits both the
 * tyre size label and the stock id (so we can pass tyreId to pricing).
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { GoldInput } from '@/components/ui/GoldInput';
import { listStock } from '@/lib/api/stock';
import type { StockItem } from '@/types/stock';

interface Props {
  initialQuery?: string;
  onSelect: (item: StockItem) => void;
  onClear?: () => void;
}

function badgeFor(item: StockItem): { label: string; cls: string } {
  if (item.fastFitAvailable) return { label: 'Fast fit', cls: 'bg-success/15 text-success' };
  switch (item.availability) {
    case 'in_stock':
      return { label: 'In stock', cls: 'bg-success/15 text-success' };
    case 'low_stock':
      return { label: 'Low stock', cls: 'bg-warning/15 text-warning' };
    case 'special_order':
    default:
      return { label: 'Special order', cls: 'bg-info/15 text-info' };
  }
}

export function TyreSizeAutocomplete(props: Props): React.JSX.Element {
  const [query, setQuery] = useState(props.initialQuery ?? '');
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const lastReqIdRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const reqId = ++lastReqIdRef.current;
    const handle = setTimeout(() => {
      void listStock({ search: trimmed, limit: 8 })
        .then((res) => {
          if (reqId !== lastReqIdRef.current) return;
          setItems(res.items);
          setLoading(false);
        })
        .catch(() => {
          if (reqId !== lastReqIdRef.current) return;
          setItems([]);
          setLoading(false);
        });
    }, 350);
    return (): void => clearTimeout(handle);
  }, [query]);

  return (
    <View>
      <GoldInput
        label="Tyre size or SKU"
        placeholder="e.g. 205/55 R16 or brand"
        value={query}
        onChangeText={(t) => {
          setQuery(t);
          setOpen(true);
          if (!t.trim()) props.onClear?.();
        }}
        autoCapitalize="characters"
        autoCorrect={false}
      />
      {open && (loading || items.length > 0) ? (
        <View className="mt-2 rounded-lg border border-border bg-surface overflow-hidden">
          {loading ? (
            <View className="flex-row items-center gap-2 px-3 py-2">
              <ActivityIndicator size="small" />
              <Text className="text-text-muted text-xs">Searching stock…</Text>
            </View>
          ) : null}
          {items.map((it) => {
            const badge = badgeFor(it);
            const isSpecial = it.availability === 'special_order';
            return (
              <Pressable
                key={it.stockId}
                onPress={() => {
                  setQuery(it.sizeLabel);
                  setItems([]);
                  setOpen(false);
                  props.onSelect(it);
                }}
                className="px-3 py-2.5 border-b border-border/30 active:bg-surfaceMuted"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-text text-sm font-semibold flex-1" numberOfLines={1}>
                    {it.brand} {it.model} — {it.sizeLabel}
                  </Text>
                  <View className={`rounded-full px-2 py-0.5 ml-2 ${badge.cls}`}>
                    <Text className={`text-[10px] font-semibold ${badge.cls}`}>
                      {badge.label}
                    </Text>
                  </View>
                </View>
                <Text className="text-text-muted text-[11px] mt-0.5">
                  SKU {it.sku} · {it.tier} · qty {it.quantityAvailable}
                </Text>
                {isSpecial ? (
                  <Text className="text-info text-[10px] mt-0.5">
                    Special order — fitted within 3 working days
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
