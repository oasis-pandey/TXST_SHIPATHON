import type { Store } from "@reduxjs/toolkit";

import {
  advanceQueue,
  appendQueue,
  replaceQueue,
  resetQueue,
} from "@/matching/data-access/store/discover/discover.slice";
import type { RootState } from "@/shared/data-access/store";

import type {
  DiscoverQueue,
  DiscoverQueueSnapshot,
  UserRecommendationProfile,
  ProfileQueue,
} from "./profile-queue";

const emptyQueue = { profiles: [], position: 0 };
function createLoadingSnapshot<T>(): DiscoverQueueSnapshot<T> {
  return {
    current: undefined,
    next: undefined,
    length: 0,
    position: 0,
    isReady: false,
  };
}

/**
 * Redux adapter for one named match queue. The UI only receives the
 * ProfileQueue interface, so a mode can inject a different queue implementation.
 */
export function createReduxDiscoverQueue<T extends { id: string }>(
    store: Store<RootState>,
    queueId: string,
): DiscoverQueue<T> {
    const getQueue = () => store.getState().matching[queueId] ?? emptyQueue;
    let previousQueue = getQueue();
    let previousSnapshot: DiscoverQueueSnapshot<T> =
        previousQueue === emptyQueue
            ? createLoadingSnapshot<T>()
            : {
                current: previousQueue.profiles[previousQueue.position] as T | undefined,
                next: previousQueue.profiles[previousQueue.position + 1] as T | undefined,
                length: previousQueue.profiles.length,
                position: previousQueue.position,
                isReady: true,
            };

    const getSnapshot = () => {
        const queue = getQueue();
        if (queue === previousQueue) return previousSnapshot;

        previousQueue = queue;
        previousSnapshot = {
            current: queue.profiles[queue.position] as T | undefined,
            next: queue.profiles[queue.position + 1] as T | undefined,
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
    append: (profiles: readonly T[]) =>
      store.dispatch(appendQueue({ queueId, profiles })),
    reset: () => store.dispatch(resetQueue({ queueId })),
    replace: (profiles: readonly T[]) =>
      store.dispatch(replaceQueue({ queueId, profiles })),
    subscribe: (listener) => store.subscribe(listener),
  };
}

export function createReduxProfileQueue(
  store: Store<RootState>,
  queueId: string,
): ProfileQueue {
  return createReduxDiscoverQueue<UserRecommendationProfile>(store, queueId);
}
