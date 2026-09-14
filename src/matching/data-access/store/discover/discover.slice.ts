import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { UserRecommendationProfile } from "@/matching/data-access/profile-queue";

type QueueState = {
  profiles: UserRecommendationProfile[];
  position: number;
};

type ProfileQueuesState = Record<string, QueueState>;

const initialState: ProfileQueuesState = {};

const profileQueuesSlice = createSlice({
  name: "profileQueues",
  initialState,
  reducers: {
    replaceQueue: (
      state,
      action: PayloadAction<{
        queueId: string;
        profiles: readonly UserRecommendationProfile[];
      }>,
    ) => {
      state[action.payload.queueId] = {
        profiles: [...action.payload.profiles],
        position: 0,
      };
    },
    appendQueue: (
      state,
      action: PayloadAction<{
        queueId: string;
        profiles: readonly UserRecommendationProfile[];
      }>,
    ) => {
      const queue = state[action.payload.queueId];
      if (!queue) {
        state[action.payload.queueId] = {
          profiles: [...action.payload.profiles],
          position: 0,
        };
        return;
      }

      const knownProfileIds = new Set(queue.profiles.map((profile) => profile.id));
      queue.profiles.push(
        ...action.payload.profiles.filter((profile) => !knownProfileIds.has(profile.id)),
      );
    },
    advanceQueue: (
      state,
      action: PayloadAction<{ queueId: string; expectedPosition: number }>,
    ) => {
      const queue = state[action.payload.queueId];
      if (queue && queue.position === action.payload.expectedPosition) {
        queue.position = Math.min(queue.position + 1, queue.profiles.length);
      }
    },
    resetQueue: (state, action: PayloadAction<{ queueId: string }>) => {
      const queue = state[action.payload.queueId];
      if (queue) queue.position = 0;
    },
  },
});

export const { advanceQueue, appendQueue, replaceQueue, resetQueue } =
  profileQueuesSlice.actions;
export default profileQueuesSlice.reducer;
