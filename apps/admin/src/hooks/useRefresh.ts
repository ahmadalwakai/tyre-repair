import React, { useCallback, useState } from 'react';
import { RefreshControl, type RefreshControlProps } from 'react-native';

/**
 * Unified pull-to-refresh helper. Pass an async loader; receive a ready-made
 * `RefreshControl` element styled with the brand red, plus `refreshing` state.
 *
 *   const { refreshControl, refreshing } = useRefresh(load);
 *   <ScrollView refreshControl={refreshControl} />
 */
export function useRefresh(loader: () => unknown | Promise<unknown>): {
  refreshing: boolean;
  onRefresh: () => void;
  refreshControl: React.ReactElement<RefreshControlProps>;
} {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.resolve(loader())
      .catch(() => undefined)
      .finally(() => setRefreshing(false));
  }, [loader]);

  const refreshControl = React.createElement(RefreshControl, {
    refreshing,
    onRefresh,
    tintColor: '#E30613',
    colors: ['#E30613', '#D4AF37'],
    progressBackgroundColor: '#1A1A22',
  });

  return { refreshing, onRefresh, refreshControl };
}
