import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Info,
  Refresh,
  FilterList,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { fetchEvents, resolveEvent } from '../store/eventSlice';

const severityIcons: Record<string, React.ReactNode> = {
  low: <Info fontSize="small" />,
  medium: <Warning fontSize="small" />,
  high: <ErrorIcon fontSize="small" />,
  critical: <ErrorIcon fontSize="small" />,
};

const severityColors: Record<string, 'default' | 'info' | 'warning' | 'error'> = {
  low: 'default',
  medium: 'info',
  high: 'warning',
  critical: 'error',
};

const typeLabels: Record<string, string> = {
  door_open: 'Puerta Abierta',
  door_close: 'Puerta Cerrada',
  visitor_call: 'Llamada Visitante',
  resident_call: 'Llamada Residente',
  access_granted: 'Acceso Permitido',
  access_denied: 'Acceso Denegado',
  camera_view: 'Vista de Cámara',
  alarm: 'Alarma',
  maintenance: 'Mantenimiento',
  system: 'Sistema',
};

export const Events: React.FC = () => {
  const dispatch = useAppDispatch();
  const { events, loading } = useAppSelector((state) => state.events);
  const { buildings } = useAppSelector((state) => state.buildings);
  const [filters, setFilters] = useState({
    buildingId: '',
    type: '',
    severity: '',
    resolved: '',
  });

  useEffect(() => {
    dispatch(fetchEvents());
  }, [dispatch]);

  const handleFilter = () => {
    const params: any = {};
    if (filters.buildingId) params.buildingId = filters.buildingId;
    if (filters.type) params.type = filters.type;
    if (filters.severity) params.severity = filters.severity;
    if (filters.resolved !== '') params.resolved = filters.resolved === 'true';
    
    dispatch(fetchEvents(params));
  };

  const handleResolve = async (eventId: string) => {
    await dispatch(resolveEvent(eventId));
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: es });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Registro de Eventos
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => dispatch(fetchEvents())}
        >
          Actualizar
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Edificio</InputLabel>
            <Select
              value={filters.buildingId}
              onChange={(e) => setFilters({ ...filters, buildingId: e.target.value })}
              label="Edificio"
            >
              <MenuItem value="">Todos</MenuItem>
              {buildings.map((building) => (
                <MenuItem key={building.id} value={building.id}>
                  {building.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Tipo</InputLabel>
            <Select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              label="Tipo"
            >
              <MenuItem value="">Todos</MenuItem>
              {Object.entries(typeLabels).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Severidad</InputLabel>
            <Select
              value={filters.severity}
              onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
              label="Severidad"
            >
              <MenuItem value="">Todas</MenuItem>
              <MenuItem value="low">Baja</MenuItem>
              <MenuItem value="medium">Media</MenuItem>
              <MenuItem value="high">Alta</MenuItem>
              <MenuItem value="critical">Crítica</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Estado</InputLabel>
            <Select
              value={filters.resolved}
              onChange={(e) => setFilters({ ...filters, resolved: e.target.value })}
              label="Estado"
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="false">Sin resolver</MenuItem>
              <MenuItem value="true">Resueltos</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="contained"
            startIcon={<FilterList />}
            onClick={handleFilter}
          >
            Filtrar
          </Button>
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Fecha/Hora</TableCell>
              <TableCell>Edificio</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell align="center">Severidad</TableCell>
              <TableCell align="center">Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id} hover>
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(event.createdAt)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {event.Building?.name || 'N/A'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {typeLabels[event.type] || event.type}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {event.description}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    icon={severityIcons[event.severity] as React.ReactElement || <Info fontSize="small" />}
                    label={event.severity.toUpperCase()}
                    color={severityColors[event.severity] || 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  {event.resolved ? (
                    <Chip
                      icon={<CheckCircle fontSize="small" />}
                      label="Resuelto"
                      color="success"
                      size="small"
                    />
                  ) : (
                    <Chip
                      label="Pendiente"
                      color="warning"
                      size="small"
                    />
                  )}
                </TableCell>
                <TableCell align="center">
                  {!event.resolved && (
                    <Tooltip title="Marcar como resuelto">
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => handleResolve(event.id)}
                      >
                        <CheckCircle />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};