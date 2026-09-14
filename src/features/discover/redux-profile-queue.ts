import type { Store } from '@reduxjs/toolkit';

import { advanceQueue, replaceQueue, resetQueue } from '@/store/profile-queues-slice';
import type { RootState } from '@/store/store';

import type { MatchProfile, ProfileQueue } from './profile-queue';

const emptyQueue = { profiles: [], position: 0 };

/**
 * Redux adapter for one named match queue. The UI only receives the
 * ProfileQueue interface, so a mode can inject a different queue implementation.
 */
export function createReduxProfileQueue(
  store: Store<RootState>,
  queueId: string
): ProfileQueue {
  const getQueue = () => store.getState().profileQueues[queueId] ?? emptyQueue;

  return {
    current: () => {
      const queue = getQueue();
      return queue.profiles[queue.position];
    },
    peek: () => {
      const queue = getQueue();
      return queue.profiles[queue.position + 1];
    },
    advance: () => store.dispatch(advanceQueue({ queueId })),
    reset: () => store.dispatch(resetQueue({ queueId })),
    replace: (profiles: readonly MatchProfile[]) =>
      store.dispatch(replaceQueue({ queueId, profiles })),
    subscribe: (listener) => store.subscribe(listener),
    get length() {
      return getQueue().profiles.length;
    },
    get position() {
      return getQueue().position;
    },
  };
}
