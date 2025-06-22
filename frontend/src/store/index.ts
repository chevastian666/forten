import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import buildingReducer from './buildingSlice';
import eventReducer from './eventSlice';
import accessReducer from './accessSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    buildings: buildingReducer,
    events: eventReducer,
    access: accessReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;