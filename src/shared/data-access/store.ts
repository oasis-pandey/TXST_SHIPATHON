import { configureStore } from "@reduxjs/toolkit";

import matchingReducer from "@/matching/data-access/store/matching.reducer";

export const store = configureStore({
  reducer: {
    matching: matchingReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;