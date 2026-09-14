import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { MatchProfile } from "@/features/discover/profile-queue";

type QueueState = {
  profiles: MatchProfile[];
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
        profiles: readonly MatchProfile[];
      }>,
    ) => {
      state[action.payload.queueId] = {
        profiles: [...action.payload.profiles],
        position: 0,
      };
    },
    advanceQueue: (state, action: PayloadAction<{ queueId: string }>) => {
      const queue = state[action.payload.queueId];
      if (queue)
        queue.position = Math.min(queue.position + 1, queue.profiles.length);
    },
    resetQueue: (state, action: PayloadAction<{ queueId: string }>) => {
      const queue = state[action.payload.queueId];
      if (queue) queue.position = 0;
    },
  },
});

export const { advanceQueue, replaceQueue, resetQueue } =
  profileQueuesSlice.actions;
export default profileQueuesSlice.reducer;
