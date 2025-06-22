import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add,
  Edit,
  Visibility,
  Search,
  Business,
  Phone,
  Email,
  LocationOn,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { fetchBuildings, createBuilding, updateBuilding } from '../store/buildingSlice';
import { Building } from '../types';

const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'warning'> = {
  prospect: 'default',
  quoting: 'warning',
  contract: 'primary',
  active: 'success',
  inactive: 'default',
};

const statusLabels: Record<string, string> = {
  prospect: 'Prospecto',
  quoting: 'Cotizando',
  contract: 'En Contrato',
  active: 'Activo',
  inactive: 'Inactivo',
};

export const Buildings: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { buildings, loading } = useAppSelector((state) => state.buildings);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Partial<Building> | null>(null);

  useEffect(() => {
    dispatch(fetchBuildings());
  }, [dispatch]);

  const handleSearch = () => {
    dispatch(fetchBuildings({ search }));
  };

  const handleCreateEdit = async () => {
    if (editingBuilding) {
      if (editingBuilding.id) {
        await dispatch(updateBuilding({ 
          id: editingBuilding.id, 
          data: editingBuilding 
        }));
      } else {
        await dispatch(createBuilding(editingBuilding));
      }
      setDialogOpen(false);
      setEditingBuilding(null);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Gestión de Edificios
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            setEditingBuilding({
              name: '',
              address: '',
              city: 'Montevideo',
              country: 'Uruguay',
              status: 'prospect',
            });
            setDialogOpen(true);
          }}
        >
          Nuevo Edificio
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            fullWidth
            placeholder="Buscar por nombre o dirección..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
          <Button variant="outlined" onClick={handleSearch}>
            Buscar
          </Button>
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Dirección</TableCell>
              <TableCell>Ciudad</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="center">Unidades</TableCell>
              <TableCell align="center">Cámaras</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {buildings.map((building) => (
              <TableRow key={building.id} hover>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="medium">
                    {building.name}
                  </Typography>
                </TableCell>
                <TableCell>{building.address}</TableCell>
                <TableCell>{building.city}</TableCell>
                <TableCell>
                  <Chip
                    label={statusLabels[building.status]}
                    color={statusColors[building.status]}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">{building.totalUnits}</TableCell>
                <TableCell align="center">{building.totalCameras}</TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={() => navigate(`/buildings/${building.id}`)}
                  >
                    <Visibility />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setEditingBuilding(building);
                      setDialogOpen(true);
                    }}
                  >
                    <Edit />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingBuilding?.id ? 'Editar Edificio' : 'Nuevo Edificio'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Nombre del Edificio"
                value={editingBuilding?.name || ''}
                onChange={(e) => setEditingBuilding({ ...editingBuilding, name: e.target.value })}
                required
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Dirección"
                value={editingBuilding?.address || ''}
                onChange={(e) => setEditingBuilding({ ...editingBuilding, address: e.target.value })}
                required
              />
            </Grid>
            <Grid size={6}>
              <TextField
                fullWidth
                label="Ciudad"
                value={editingBuilding?.city || ''}
                onChange={(e) => setEditingBuilding({ ...editingBuilding, city: e.target.value })}
                required
              />
            </Grid>
            <Grid size={6}>
              <TextField
                fullWidth
                label="Estado"
                select
                value={editingBuilding?.status || 'prospect'}
                onChange={(e) => setEditingBuilding({ ...editingBuilding, status: e.target.value as any })}
              >
                {Object.entries(statusLabels).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={6}>
              <TextField
                fullWidth
                label="Teléfono"
                value={editingBuilding?.phone || ''}
                onChange={(e) => setEditingBuilding({ ...editingBuilding, phone: e.target.value })}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={editingBuilding?.email || ''}
                onChange={(e) => setEditingBuilding({ ...editingBuilding, email: e.target.value })}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                fullWidth
                label="Total de Unidades"
                type="number"
                value={editingBuilding?.totalUnits || 0}
                onChange={(e) => setEditingBuilding({ ...editingBuilding, totalUnits: parseInt(e.target.value) })}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                fullWidth
                label="Total de Cámaras"
                type="number"
                value={editingBuilding?.totalCameras || 0}
                onChange={(e) => setEditingBuilding({ ...editingBuilding, totalCameras: parseInt(e.target.value) })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleCreateEdit} variant="contained">
            {editingBuilding?.id ? 'Guardar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};