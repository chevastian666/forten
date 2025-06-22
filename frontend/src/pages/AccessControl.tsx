import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  MenuItem,
  Alert,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add,
  ContentCopy,
  Delete,
  VpnKey,
  Timer,
  Person,
  Phone,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { fetchAccesses, createAccess, deleteAccess } from '../store/accessSlice';
import { Access } from '../types';

// No longer using type labels since we removed the type field

export const AccessControl: React.FC = () => {
  const dispatch = useAppDispatch();
  const { accesses, loading } = useAppSelector((state) => state.access);
  const { buildings } = useAppSelector((state) => state.buildings);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pinCopied, setPinCopied] = useState<string | null>(null);
  const [newAccess, setNewAccess] = useState<Partial<Access>>({
    visitorName: '',
    visitorDocument: '',
    unitNumber: '',
    buildingId: '',
    validUntil: format(new Date(Date.now() + 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"),
  });

  useEffect(() => {
    dispatch(fetchAccesses());
  }, [dispatch]);

  const handleCreate = async () => {
    if (newAccess.visitorName && newAccess.buildingId && newAccess.validUntil) {
      await dispatch(createAccess(newAccess));
      setDialogOpen(false);
      setNewAccess({
        visitorName: '',
        visitorDocument: '',
        unitNumber: '',
        buildingId: '',
        validUntil: format(new Date(Date.now() + 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"),
      });
    }
  };

  const handleCopyPin = (pin: string) => {
    navigator.clipboard.writeText(pin);
    setPinCopied(pin);
    setTimeout(() => setPinCopied(null), 2000);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Está seguro de desactivar este acceso?')) {
      await dispatch(deleteAccess(id));
    }
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: es });
  };

  const isAccessActive = (access: Access) => {
    const now = new Date();
    return !access.used && 
           new Date(access.validFrom) <= now && 
           new Date(access.validUntil) >= now;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Control de Accesos
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setDialogOpen(true)}
        >
          Generar PIN
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                PINs Activos
              </Typography>
              <Typography variant="h4">
                {accesses.filter(a => isAccessActive(a)).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Usos Hoy
              </Typography>
              <Typography variant="h4">
                {accesses?.filter(a => a.used).length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Accesos
              </Typography>
              <Typography variant="h4">
                {accesses?.length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Vencidos
              </Typography>
              <Typography variant="h4">
                {accesses?.filter(a => new Date(a.validUntil) < new Date()).length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>PIN</TableCell>
              <TableCell>Visitante</TableCell>
              <TableCell>Unidad</TableCell>
              <TableCell>Edificio</TableCell>
              <TableCell>Válido Hasta</TableCell>
              <TableCell align="center">Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {accesses?.map((access) => (
              <TableRow key={access.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <VpnKey fontSize="small" color="primary" />
                    <Typography variant="body2" fontWeight="medium" fontFamily="monospace">
                      {access.pin}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleCopyPin(access.pin)}
                    >
                      <ContentCopy fontSize="small" />
                    </IconButton>
                    {pinCopied === access.pin && (
                      <Typography variant="caption" color="success.main">
                        Copiado!
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {access.visitorName}
                    </Typography>
                    {access.visitorDocument && (
                      <Typography variant="caption" color="text.secondary">
                        Doc: {access.visitorDocument}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {access.unitNumber}
                  </Typography>
                </TableCell>
                <TableCell>{access.Building?.name}</TableCell>
                <TableCell>{formatDate(access.validUntil)}</TableCell>
                <TableCell align="center">
                  {access.used ? (
                    <Chip label="Usado" color="default" size="small" />
                  ) : isAccessActive(access) ? (
                    <Chip label="Activo" color="success" size="small" />
                  ) : (
                    <Chip label="Vencido" color="warning" size="small" />
                  )}
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(access.id)}
                    disabled={access.used}
                  >
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Generar Nuevo PIN de Acceso</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Nombre del Visitante"
                value={newAccess.visitorName}
                onChange={(e) => setNewAccess({ ...newAccess, visitorName: e.target.value })}
                required
                InputProps={{
                  startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                fullWidth
                label="Documento"
                value={newAccess.visitorDocument}
                onChange={(e) => setNewAccess({ ...newAccess, visitorDocument: e.target.value })}
                InputProps={{
                  startAdornment: <Phone sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                fullWidth
                label="Número de Unidad"
                value={newAccess.unitNumber}
                onChange={(e) => setNewAccess({ ...newAccess, unitNumber: e.target.value })}
                required
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Edificio"
                select
                value={newAccess.buildingId}
                onChange={(e) => setNewAccess({ ...newAccess, buildingId: e.target.value })}
                required
              >
                {buildings?.map((building) => (
                  <MenuItem key={building.id} value={building.id}>
                    {building.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={6}>
              <TextField
                fullWidth
                label="Válido Desde"
                type="datetime-local"
                value={newAccess.validFrom || format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                onChange={(e) => setNewAccess({ ...newAccess, validFrom: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                fullWidth
                label="Válido Hasta"
                type="datetime-local"
                value={newAccess.validUntil}
                onChange={(e) => setNewAccess({ ...newAccess, validUntil: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
          </Grid>
          <Alert severity="info" sx={{ mt: 2 }}>
            El PIN será generado automáticamente y enviado por WhatsApp si es posible.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleCreate} variant="contained">
            Generar PIN
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};