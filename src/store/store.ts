import { configureStore } from "@reduxjs/toolkit";

import profileQueuesReducer from "./profile-queues-slice";

export const store = configureStore({
  reducer: {
    profileQueues: profileQueuesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
