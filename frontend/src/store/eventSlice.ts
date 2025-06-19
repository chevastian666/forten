import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';
import { Event } from '../types';

interface EventState {
  events: Event[];
  total: number;
  page: number;
  totalPages: number;
  stats: {
    totalEvents: number;
    todayEvents: number;
    unresolvedEvents: number;
    eventsByType: Record<string, number>;
  } | null;
  loading: boolean;
  error: string | null;
}

const initialState: EventState = {
  events: [],
  total: 0,
  page: 1,
  totalPages: 1,
  stats: null,
  loading: false,
  error: null,
};

export const fetchEvents = createAsyncThunk(
  'events/fetchAll',
  async (params?: {
    buildingId?: string;
    type?: string;
    severity?: string;
    resolved?: boolean;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/events', { params });
    return response.data;
  }
);

export const fetchEventStats = createAsyncThunk(
  'events/fetchStats',
  async (buildingId?: string) => {
    const response = await api.get('/events/stats', { 
      params: buildingId ? { buildingId } : {} 
    });
    return response.data;
  }
);

export const createEvent = createAsyncThunk(
  'events/create',
  async (data: Partial<Event>) => {
    const response = await api.post('/events', data);
    return response.data;
  }
);

export const resolveEvent = createAsyncThunk(
  'events/resolve',
  async (id: string) => {
    const response = await api.put(`/events/${id}/resolve`);
    return response.data;
  }
);

const eventSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    addEvent: (state, action) => {
      state.events.unshift(action.payload);
      if (state.events.length > 20) {
        state.events.pop();
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all
      .addCase(fetchEvents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEvents.fulfilled, (state, action) => {
        state.loading = false;
        state.events = action.payload.events;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.totalPages = action.payload.totalPages;
      })
      .addCase(fetchEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch events';
      })
      // Fetch stats
      .addCase(fetchEventStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })
      // Create
      .addCase(createEvent.fulfilled, (state, action) => {
        state.events.unshift(action.payload);
        state.total += 1;
      })
      // Resolve
      .addCase(resolveEvent.fulfilled, (state, action) => {
        const index = state.events.findIndex(e => e.id === action.payload.id);
        if (index !== -1) {
          state.events[index] = action.payload;
        }
      });
  },
});

export const { clearError, addEvent } = eventSlice.actions;
export default eventSlice.reducer;