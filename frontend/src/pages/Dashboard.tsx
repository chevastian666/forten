import React, { useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  LinearProgress,
  Stack,
  Button,
  Fab,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Business,
  Warning,
  CheckCircle,
  Videocam,
  VpnKey,
  TrendingUp,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { fetchEventStats } from '../store/eventSlice';
import { fetchBuildings } from '../store/buildingSlice';
import { ActivityChart } from '../components/ActivityChart';
import { WeeklyActivityChart } from '../components/WeeklyActivityChart';
import { useNavigate } from 'react-router-dom';

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}> = ({ title, value, icon, color, subtitle }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Box
          sx={{
            p: 1,
            borderRadius: 1,
            backgroundColor: `${color}.main`,
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
      <Typography variant="h4" component="div" fontWeight="bold">
        {value}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {subtitle}
        </Typography>
      )}
    </CardContent>
  </Card>
);

export const Dashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { stats } = useAppSelector((state) => state.events);
  const { buildings } = useAppSelector((state) => state.buildings);
  const user = useAppSelector((state) => state.auth.user);

  useEffect(() => {
    dispatch(fetchEventStats());
    dispatch(fetchBuildings({ status: 'active', limit: 5 }));
  }, [dispatch]);

  const activeBuildings = buildings?.filter(b => b.status === 'active').length || 0;

  const canAccessExecutive = user?.role === 'admin' || user?.role === 'manager';

  return (
    <Box sx={{ position: 'relative' }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 3 }}
      >
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          Bienvenido, {user?.firstName}
        </Typography>

        {canAccessExecutive && (
          <Button
            variant="contained"
            startIcon={<DashboardIcon />}
            onClick={() => navigate('/executive')}
            sx={{
              background: 'linear-gradient(45deg, #FF6B35 30%, #FF8F65 90%)',
              boxShadow: '0 4px 16px rgba(255, 107, 53, 0.3)',
              '&:hover': {
                background: 'linear-gradient(45deg, #E85D25 30%, #FF6B35 90%)',
                boxShadow: '0 6px 20px rgba(255, 107, 53, 0.4)',
              },
            }}
          >
            Dashboard Ejecutivo
          </Button>
        )}
      </Stack>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Edificios Activos"
            value={activeBuildings}
            icon={<Business />}
            color="primary"
            subtitle="Monitoreados 24/7"
          />
        </Grid>
        
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Eventos Hoy"
            value={stats?.todayEvents || 0}
            icon={<TrendingUp />}
            color="success"
            subtitle="Últimas 24 horas"
          />
        </Grid>
        
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Sin Resolver"
            value={stats?.unresolvedEvents || 0}
            icon={<Warning />}
            color="warning"
            subtitle="Requieren atención"
          />
        </Grid>
        
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Estado Sistema"
            value="OPERATIVO"
            icon={<CheckCircle />}
            color="success"
            subtitle="Todos los servicios OK"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Actividad Temporal
            </Typography>
            <ActivityChart type="area" height={350} />
          </Paper>
        </Grid>
        
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={3}>
            {/* Weekly Activity Chart */}
            <Paper sx={{ p: 3 }}>
              <WeeklyActivityChart height={200} />
            </Paper>

            {/* Buildings List */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Edificios Activos
              </Typography>
              <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                {buildings?.map((building) => (
                  <Box
                    key={building.id}
                    sx={{
                      p: 2,
                      mb: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="subtitle1" fontWeight="medium">
                      {building.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {building.address}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Videocam fontSize="small" sx={{ mr: 0.5 }} />
                        <Typography variant="body2">
                          {building.totalCameras} cámaras
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <VpnKey fontSize="small" sx={{ mr: 0.5 }} />
                        <Typography variant="body2">
                          {building.totalUnits} unidades
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};