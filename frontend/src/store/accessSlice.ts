import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';
import { Access } from '../types';

interface AccessState {
  accesses: Access[];
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
}

const initialState: AccessState = {
  accesses: [],
  total: 0,
  page: 1,
  totalPages: 1,
  loading: false,
  error: null,
};

export const fetchAccesses = createAsyncThunk(
  'access/fetchAll',
  async (params?: {
    buildingId?: string;
    type?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/access', { params });
    return response.data;
  }
);

export const createAccess = createAsyncThunk(
  'access/create',
  async (data: Partial<Access>) => {
    const response = await api.post('/access', data);
    return response.data;
  }
);

export const validateAccess = createAsyncThunk(
  'access/validate',
  async (data: { pin: string; buildingId?: string }) => {
    const response = await api.post('/access/validate', data);
    return response.data;
  }
);

export const updateAccess = createAsyncThunk(
  'access/update',
  async ({ id, data }: { id: string; data: Partial<Access> }) => {
    const response = await api.put(`/access/${id}`, data);
    return response.data;
  }
);

export const deleteAccess = createAsyncThunk(
  'access/delete',
  async (id: string) => {
    await api.delete(`/access/${id}`);
    return id;
  }
);

const accessSlice = createSlice({
  name: 'access',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all
      .addCase(fetchAccesses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAccesses.fulfilled, (state, action) => {
        state.loading = false;
        state.accesses = action.payload.accesses;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.totalPages = action.payload.totalPages;
      })
      .addCase(fetchAccesses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch accesses';
      })
      // Create
      .addCase(createAccess.fulfilled, (state, action) => {
        state.accesses.unshift(action.payload);
        state.total += 1;
      })
      // Update
      .addCase(updateAccess.fulfilled, (state, action) => {
        const index = state.accesses.findIndex(a => a.id === action.payload.id);
        if (index !== -1) {
          state.accesses[index] = action.payload;
        }
      })
      // Delete
      .addCase(deleteAccess.fulfilled, (state, action) => {
        state.accesses = state.accesses.filter(a => a.id !== action.payload);
        state.total -= 1;
      });
  },
});

export const { clearError } = accessSlice.actions;
export default accessSlice.reducer;