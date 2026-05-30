import React, { useMemo } from 'react';
import type { ListRenderItem } from '@shopify/flash-list';
import { FlashList } from '@shopify/flash-list';
import { ActivityIndicator, type RefreshControlProps, Text, View } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';

/**
 * Generic infinite-scroll list wrapper around `FlashList` + `useInfiniteQuery`.
 *
 * The `loader` returns one page given `pageParam` (1-based). It must report
 * back either `hasMore: boolean` or a numeric `totalPages` so the wrapper can
 * stop paging at the end.
 */
export interface InfinitePage<T> {
  items: T[];
  hasMore: boolean;
}

export interface InfiniteListProps<T> {
  queryKey: readonly unknown[];
  loader: (pageParam: number) => Promise<InfinitePage<T>>;
  /** Same signature as `FlashList`'s `renderItem`. */
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T, index: number) => string;
  ListHeaderComponent?: React.ReactElement | null;
  ListEmptyComponent?: React.ReactElement | null;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  contentContainerStyle?: object;
}

export function InfiniteList<T>({
  queryKey,
  loader,
  renderItem,
  keyExtractor,
  ListHeaderComponent,
  ListEmptyComponent,
  refreshControl,
  contentContainerStyle,
}: InfiniteListProps<T>): React.JSX.Element {
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam = 1 }) => loader(pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (last, all) => (last.hasMore ? all.length + 1 : undefined),
  });

  const items = useMemo<T[]>(
    () => (query.data?.pages ?? []).flatMap((p) => p.items),
    [query.data],
  );

  return (
    <FlashList
      data={items}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) {
          void query.fetchNextPage();
        }
      }}
      onEndReachedThreshold={0.4}
      {...(ListHeaderComponent ? { ListHeaderComponent } : {})}
      {...(ListEmptyComponent ? { ListEmptyComponent } : {})}
      {...(refreshControl ? { refreshControl } : {})}
      {...(contentContainerStyle ? { contentContainerStyle } : {})}
      ListFooterComponent={
        query.isFetchingNextPage ? (
          <View style={{ paddingVertical: 18, alignItems: 'center' }}>
            <ActivityIndicator color="#E30613" />
            <Text className="text-text-dim text-xs mt-2">Loading more…</Text>
          </View>
        ) : !query.hasNextPage && items.length > 0 ? (
          <View style={{ paddingVertical: 18, alignItems: 'center' }}>
            <Text className="text-text-dim text-xs">No more results</Text>
          </View>
        ) : null
      }
    />
  );
}
