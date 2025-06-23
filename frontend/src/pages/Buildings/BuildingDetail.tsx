import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Divider,
  Paper,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  IconButton,
  Skeleton,
  Stack,
  Grid,
} from '@mui/material';
import {
  ArrowBack,
  Business,
  LocationOn,
  Phone,
  Email,
  Apartment,
  Videocam,
  Security,
  Person,
  Edit,
  MoreVert,
  CheckCircle,
  Warning,
  Error,
  Schedule,
  EventNote,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { fetchBuildingById } from '../../store/buildingSlice';
import { fetchEvents } from '../../store/eventSlice';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import NotificationService from '../../services/notificationService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`building-tabpanel-${index}`}
      aria-labelledby={`building-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

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

const InfoCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  value: string | number;
  color?: string;
}> = ({ icon, title, value, color = 'primary.main' }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Box
          sx={{
            p: 1,
            borderRadius: 1,
            backgroundColor: color,
            color: 'white',
            display: 'flex',
            mr: 2,
          }}
        >
          {icon}
        </Box>
        <Typography color="text.secondary" variant="body2">
          {title}
        </Typography>
      </Box>
      <Typography variant="h5" component="div" fontWeight="bold">
        {value}
      </Typography>
    </CardContent>
  </Card>
);

export const BuildingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [tabValue, setTabValue] = useState(0);
  
  const { currentBuilding: building, loading } = useAppSelector((state) => state.buildings);
  const { events } = useAppSelector((state) => state.events);
  
  // Filter events for this building
  const buildingEvents = events.filter(event => event.buildingId === building?.id);
  const recentEvents = buildingEvents.slice(0, 5);

  useEffect(() => {
    if (id) {
      dispatch(fetchBuildingById(id));
      dispatch(fetchEvents({ buildingId: id, limit: 50 }));
    }
  }, [dispatch, id]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Box>
        <Skeleton variant="text" sx={{ fontSize: '2rem', mb: 3 }} />
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
              <Skeleton variant="rectangular" height={120} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (!building) {
    return (
      <Box sx={{ textAlign: 'center', py: 5 }}>
        <Typography variant="h5" color="text.secondary">
          Edificio no encontrado
        </Typography>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/buildings')}
          sx={{ mt: 2 }}
        >
          Volver a Edificios
        </Button>
      </Box>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Box>
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={() => navigate('/buildings')} sx={{ mr: 2 }}>
              <ArrowBack />
            </IconButton>
            <Box>
              <Typography variant="h4" fontWeight="bold">
                {building.name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <LocationOn sx={{ fontSize: 20, color: 'text.secondary' }} />
                <Typography color="text.secondary">
                  {building.address}, {building.city}
                </Typography>
                <Chip
                  label={statusLabels[building.status]}
                  color={statusColors[building.status]}
                  size="small"
                  sx={{ ml: 2 }}
                />
              </Box>
            </Box>
          </Box>
          <Box>
            <Button
              variant="contained"
              startIcon={<Edit />}
              onClick={() => navigate(`/buildings/${building.id}/edit`)}
              sx={{ mr: 1 }}
            >
              Editar
            </Button>
            <IconButton>
              <MoreVert />
            </IconButton>
          </Box>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <InfoCard
                icon={<Apartment />}
                title="Unidades"
                value={building.totalUnits || 0}
                color="#FF6B35"
              />
            </motion.div>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <InfoCard
                icon={<Videocam />}
                title="Cámaras"
                value={building.totalCameras || 0}
                color="#2196F3"
              />
            </motion.div>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <InfoCard
                icon={<Security />}
                title="Eventos Hoy"
                value={buildingEvents.filter(e => 
                  new Date(e.timestamp).toDateString() === new Date().toDateString()
                ).length}
                color="#4CAF50"
              />
            </motion.div>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <InfoCard
                icon={<Person />}
                title="Personal"
                value={building.securityPersonnel || 0}
                color="#9C27B0"
              />
            </motion.div>
          </Grid>
        </Grid>

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="Información General" />
            <Tab label="Eventos Recientes" />
            <Tab label="Unidades" />
            <Tab label="Accesos" />
            <Tab label="Configuración" />
          </Tabs>
        </Paper>

        {/* Tab Content */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Información de Contacto
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <Phone />
                      </ListItemIcon>
                      <ListItemText
                        primary="Teléfono"
                        secondary={building.phone || 'No especificado'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Email />
                      </ListItemIcon>
                      <ListItemText
                        primary="Email"
                        secondary={building.email || 'No especificado'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <LocationOn />
                      </ListItemIcon>
                      <ListItemText
                        primary="Dirección Completa"
                        secondary={`${building.address}, ${building.city}, ${building.country}`}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Estado del Sistema
                  </Typography>
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CheckCircle sx={{ color: 'success.main', mr: 1 }} />
                        <Typography>Sistema de Seguridad</Typography>
                      </Box>
                      <Chip label="Operativo" color="success" size="small" />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CheckCircle sx={{ color: 'success.main', mr: 1 }} />
                        <Typography>Control de Acceso</Typography>
                      </Box>
                      <Chip label="Activo" color="success" size="small" />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Warning sx={{ color: 'warning.main', mr: 1 }} />
                        <Typography>CCTV</Typography>
                      </Box>
                      <Chip label="2 Offline" color="warning" size="small" />
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Eventos Recientes
              </Typography>
              <List>
                {recentEvents.length === 0 ? (
                  <ListItem>
                    <ListItemText
                      primary="No hay eventos recientes"
                      secondary="Los eventos aparecerán aquí cuando ocurran"
                    />
                  </ListItem>
                ) : (
                  recentEvents.map((event) => (
                    <ListItem key={event.id} divider>
                      <ListItemIcon>
                        <Avatar
                          sx={{
                            bgcolor: event.severity === 'high' ? 'error.main' : 
                                    event.severity === 'medium' ? 'warning.main' : 'info.main',
                          }}
                        >
                          <EventNote />
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={event.type}
                        secondary={
                          <>
                            {event.description} • {' '}
                            {format(new Date(event.timestamp), 'dd/MM/yyyy HH:mm', { locale: es })}
                          </>
                        }
                      />
                      <Chip
                        label={event.status}
                        color={event.status === 'resolved' ? 'success' : 'default'}
                        size="small"
                      />
                    </ListItem>
                  ))
                )}
              </List>
              {recentEvents.length > 0 && (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Button onClick={() => navigate(`/events?buildingId=${building.id}`)}>
                    Ver Todos los Eventos
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Unidades del Edificio
              </Typography>
              <Typography color="text.secondary">
                Esta sección está en desarrollo. Aquí podrás ver y gestionar todas las unidades del edificio.
              </Typography>
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Control de Accesos
              </Typography>
              <Typography color="text.secondary">
                Esta sección está en desarrollo. Aquí podrás gestionar los accesos y permisos del edificio.
              </Typography>
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Configuración del Edificio
              </Typography>
              <Typography color="text.secondary">
                Esta sección está en desarrollo. Aquí podrás configurar los parámetros del edificio.
              </Typography>
            </CardContent>
          </Card>
        </TabPanel>
      </Box>
    </motion.div>
  );
};