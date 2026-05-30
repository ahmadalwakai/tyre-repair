import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  acknowledgeCallClick,
  type CallClickHandledAction,
} from '@/lib/api/call-click-events';
import { qk } from '@/lib/query/keys';
import type { ActionQueueResponse } from '@/types/command-center';

interface Vars {
  callClickEventId: string;
  action: CallClickHandledAction;
  /** Item id to remove optimistically from the cached queue. */
  itemId?: string;
}

interface Snapshot {
  previous: ActionQueueResponse | undefined;
}

/**
 * Optimistic acknowledge for a website call-click action-queue row.
 *
 * On `mutate`:
 *  - removes the matching item from the cached `action-queue` immediately
 *  - decrements the matching severity counter so the header subtitle stays accurate
 * On error:
 *  - restores the previous cached snapshot
 * On settled:
 *  - invalidates `action-queue` so the next view is authoritative
 */
export function useAcknowledgeCallClick() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, Vars, Snapshot>({
    mutationFn: ({ callClickEventId, action }) =>
      acknowledgeCallClick(callClickEventId, action),
    onMutate: async ({ itemId }) => {
      if (!itemId) return { previous: undefined };
      await qc.cancelQueries({ queryKey: qk.actionQueue() });
      const previous = qc.getQueryData<ActionQueueResponse>(qk.actionQueue());
      if (previous) {
        const target = previous.items.find((i) => i.id === itemId);
        const next: ActionQueueResponse = {
          ...previous,
          items: previous.items.filter((i) => i.id !== itemId),
          counts: target
            ? {
                ...previous.counts,
                danger:
                  target.severity === 'DANGER'
                    ? Math.max(0, previous.counts.danger - 1)
                    : previous.counts.danger,
                warning:
                  target.severity === 'WARNING'
                    ? Math.max(0, previous.counts.warning - 1)
                    : previous.counts.warning,
                info:
                  target.severity === 'INFO'
                    ? Math.max(0, previous.counts.info - 1)
                    : previous.counts.info,
              }
            : previous.counts,
        };
        qc.setQueryData(qk.actionQueue(), next);
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(qk.actionQueue(), ctx.previous);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.actionQueue() });
    },
  });
}
