import type { Store } from "@reduxjs/toolkit";

import {
  advanceQueue,
  replaceQueue,
  resetQueue,
} from "@/store/profile-queues-slice";
import type { RootState } from "@/store/store";

import type {
  MatchProfile,
  ProfileQueue,
  ProfileQueueSnapshot,
} from "./profile-queue";

const emptyQueue = { profiles: [], position: 0 };
const loadingSnapshot: ProfileQueueSnapshot = {
  current: undefined,
  next: undefined,
  length: 0,
  position: 0,
  isReady: false,
};

/**
 * Redux adapter for one named match queue. The UI only receives the
 * ProfileQueue interface, so a mode can inject a different queue implementation.
 */
export function createReduxProfileQueue(
  store: Store<RootState>,
  queueId: string,
): ProfileQueue {
  const getQueue = () => store.getState().profileQueues[queueId] ?? emptyQueue;
  let previousQueue = getQueue();
  let previousSnapshot: ProfileQueueSnapshot =
    previousQueue === emptyQueue
      ? loadingSnapshot
      : {
          current: previousQueue.profiles[previousQueue.position],
          next: previousQueue.profiles[previousQueue.position + 1],
          length: previousQueue.profiles.length,
          position: previousQueue.position,
          isReady: true,
        };

  const getSnapshot = () => {
    const queue = getQueue();
    if (queue === previousQueue) return previousSnapshot;

    previousQueue = queue;
    previousSnapshot = {
      current: queue.profiles[queue.position],
      next: queue.profiles[queue.position + 1],
      length: queue.profiles.length,
      position: queue.position,
      isReady: true,
    };
    return previousSnapshot;
  };

  return {
    getSnapshot,
    advance: (expectedPosition) =>
      store.dispatch(advanceQueue({ queueId, expectedPosition })),
    reset: () => store.dispatch(resetQueue({ queueId })),
    replace: (profiles: readonly MatchProfile[]) =>
      store.dispatch(replaceQueue({ queueId, profiles })),
    subscribe: (listener) => store.subscribe(listener),
  };
}
