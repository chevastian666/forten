import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';
import { Building } from '../types';

interface BuildingState {
  buildings: Building[];
  currentBuilding: Building | null;
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
}

const initialState: BuildingState = {
  buildings: [],
  currentBuilding: null,
  total: 0,
  page: 1,
  totalPages: 1,
  loading: false,
  error: null,
};

export const fetchBuildings = createAsyncThunk(
  'buildings/fetchAll',
  async (params?: { status?: string; search?: string; page?: number; limit?: number }) => {
    const response = await api.get('/buildings', { params });
    return response.data;
  }
);

export const fetchBuilding = createAsyncThunk(
  'buildings/fetchOne',
  async (id: string) => {
    const response = await api.get(`/buildings/${id}`);
    return response.data;
  }
);

export const fetchBuildingById = createAsyncThunk(
  'buildings/fetchById',
  async (id: string) => {
    const response = await api.get(`/buildings/${id}`);
    return response.data;
  }
);

export const createBuilding = createAsyncThunk(
  'buildings/create',
  async (data: Partial<Building>) => {
    const response = await api.post('/buildings', data);
    return response.data;
  }
);

export const updateBuilding = createAsyncThunk(
  'buildings/update',
  async ({ id, data }: { id: string; data: Partial<Building> }) => {
    const response = await api.put(`/buildings/${id}`, data);
    return response.data;
  }
);

const buildingSlice = createSlice({
  name: 'buildings',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentBuilding: (state) => {
      state.currentBuilding = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all
      .addCase(fetchBuildings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBuildings.fulfilled, (state, action) => {
        state.loading = false;
        state.buildings = action.payload.buildings;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.totalPages = action.payload.totalPages;
      })
      .addCase(fetchBuildings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch buildings';
      })
      // Fetch one
      .addCase(fetchBuilding.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBuilding.fulfilled, (state, action) => {
        state.loading = false;
        state.currentBuilding = action.payload;
      })
      .addCase(fetchBuilding.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch building';
      })
      // Fetch by ID
      .addCase(fetchBuildingById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBuildingById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentBuilding = action.payload;
      })
      .addCase(fetchBuildingById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch building';
      })
      // Create
      .addCase(createBuilding.fulfilled, (state, action) => {
        state.buildings.unshift(action.payload);
        state.total += 1;
      })
      // Update
      .addCase(updateBuilding.fulfilled, (state, action) => {
        const index = state.buildings.findIndex(b => b.id === action.payload.id);
        if (index !== -1) {
          state.buildings[index] = action.payload;
        }
        if (state.currentBuilding?.id === action.payload.id) {
          state.currentBuilding = action.payload;
        }
      });
  },
});

export const { clearError, clearCurrentBuilding } = buildingSlice.actions;
export default buildingSlice.reducer;