import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  Stack,
  Button,
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
import { motion } from 'framer-motion';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { fetchEventStats } from '../store/eventSlice';
import { fetchBuildings } from '../store/buildingSlice';
import { ActivityChart } from '../components/ActivityChart';
import { WeeklyActivityChart } from '../components/WeeklyActivityChart';
import { StaggerContainer, StaggerItem, LoadingTransition } from '../components/Animations';
import NotificationService from '../services/notificationService';
import { useNavigate } from 'react-router-dom';
import { WhatsAppPanel } from '../components/WhatsApp';
import presentationModeService from '../services/presentationModeService';
import {
  PlayArrow,
  Stop,
  Fullscreen,
  Slideshow,
} from '@mui/icons-material';

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
  delay?: number;
}> = ({ title, value, icon, color, subtitle, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ 
      duration: 0.5, 
      delay,
      ease: [0.25, 0.46, 0.45, 0.94]
    }}
    whileHover={{ 
      y: -4,
      transition: { duration: 0.2 }
    }}
    style={{ height: '100%' }}
  >
    <Card 
      sx={{ 
        height: '100%',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
        }
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ duration: 0.2 }}
          >
            <Box
              sx={{
                p: 1,
                borderRadius: 1,
                backgroundColor: `${color}.main`,
                color: 'white',
                display: 'flex',
                mr: 2,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              }}
            >
              {icon}
            </Box>
          </motion.div>
          <Typography color="text.secondary" variant="body2">
            {title}
          </Typography>
        </Box>
        <motion.div
          key={value}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Typography variant="h4" component="div" fontWeight="bold">
            {value}
          </Typography>
        </motion.div>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  </motion.div>
);

export const Dashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { stats } = useAppSelector((state) => state.events);
  const { buildings } = useAppSelector((state) => state.buildings);
  const user = useAppSelector((state) => state.auth.user);
  const [loading, setLoading] = useState(true);
  const [isPresentationMode, setIsPresentationMode] = useState(false);

  useEffect(() => {
    let timeoutIds: NodeJS.Timeout[] = [];
    let isComponentMounted = true;

    const loadData = async () => {
      setLoading(true);
      
      try {
        await Promise.all([
          dispatch(fetchEventStats()).unwrap(),
          dispatch(fetchBuildings({ status: 'active', limit: 5 })).unwrap()
        ]);
        
        if (!isComponentMounted) return;
        
        // Show welcome notification
        NotificationService.success(`Bienvenido, ${user?.firstName}! Sistema operativo.`);
        
        // Simulate real-time event notification after 3 seconds
        const timeout1 = setTimeout(() => {
          if (isComponentMounted) {
            NotificationService.aiAlert({
              type: 'person',
              title: 'Nueva persona detectada',
              location: 'Entrada Principal',
              confidence: 0.94,
              severity: 'medium',
            });
          }
        }, 3000);
        timeoutIds.push(timeout1);
        
        // System status notification after 5 seconds
        const timeout2 = setTimeout(() => {
          if (isComponentMounted) {
            NotificationService.systemAlert('Sincronización de datos completada', 'system');
          }
        }, 5000);
        timeoutIds.push(timeout2);
        
      } catch (error) {
        if (isComponentMounted) {
          NotificationService.error('Error al cargar datos del dashboard');
        }
      } finally {
        const timeout3 = setTimeout(() => {
          if (isComponentMounted) {
            setLoading(false);
          }
        }, 800); // Minimum loading time for smooth animation
        timeoutIds.push(timeout3);
      }
    };

    loadData();

    // Cleanup function
    return () => {
      isComponentMounted = false;
      timeoutIds.forEach(id => clearTimeout(id));
    };
  }, [dispatch, user?.firstName]);

  const activeBuildings = buildings?.filter(b => b.status === 'active').length || 0;

  const canAccessExecutive = user?.role === 'admin' || user?.role === 'manager';

  const handlePresentationMode = () => {
    if (isPresentationMode) {
      presentationModeService.stop();
      setIsPresentationMode(false);
    } else {
      presentationModeService.start();
      setIsPresentationMode(true);
    }
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <LoadingTransition loading={loading}>
      <Box sx={{ position: 'relative' }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 3 }}
          >
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              Bienvenido, {user?.firstName}
            </Typography>

            <Stack direction="row" spacing={2}>
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
              >
                <Button
                  variant="contained"
                  startIcon={<Slideshow />}
                  onClick={() => navigate('/presentation')}
                  sx={{
                    background: 'linear-gradient(45deg, #9C27B0 30%, #BA68C8 90%)',
                    boxShadow: '0 4px 16px rgba(156, 39, 176, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #7B1FA2 30%, #9C27B0 90%)',
                      boxShadow: '0 6px 20px rgba(156, 39, 176, 0.4)',
                    },
                  }}
                >
                  Modo Presentación
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Button
                  variant={isPresentationMode ? "outlined" : "contained"}
                  startIcon={isPresentationMode ? <Stop /> : <PlayArrow />}
                  onClick={handlePresentationMode}
                  color={isPresentationMode ? "error" : "primary"}
                  sx={{
                    minWidth: 160,
                  }}
                >
                  {isPresentationMode ? 'Detener Demo' : 'Modo Demo'}
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25 }}
              >
                <IconButton
                  onClick={handleFullscreen}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Fullscreen />
                </IconButton>
              </motion.div>

              {canAccessExecutive && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="contained"
                    startIcon={<DashboardIcon />}
                    onClick={() => {
                      NotificationService.info('Navegando al Dashboard Ejecutivo...');
                      navigate('/executive');
                    }}
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
                </motion.div>
              )}
            </Stack>
          </Stack>
        </motion.div>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Edificios Activos"
              value={activeBuildings}
              icon={<Business />}
              color="primary"
              subtitle="Monitoreados 24/7"
              delay={0.1}
            />
          </Grid>
          
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Eventos Hoy"
              value={stats?.todayEvents || 0}
              icon={<TrendingUp />}
              color="success"
              subtitle="Últimas 24 horas"
              delay={0.2}
            />
          </Grid>
          
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Sin Resolver"
              value={stats?.unresolvedEvents || 0}
              icon={<Warning />}
              color="warning"
              subtitle="Requieren atención"
              delay={0.3}
            />
          </Grid>
          
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Estado Sistema"
              value="OPERATIVO"
              icon={<CheckCircle />}
              color="success"
              subtitle="Todos los servicios OK"
              delay={0.4}
            />
          </Grid>
        </Grid>

        <StaggerContainer>
          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid size={{ xs: 12, md: 8 }}>
              <StaggerItem>
                <motion.div
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2 }}
                >
                  <Paper sx={{ 
                    p: 3,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                    }
                  }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Actividad Temporal
                    </Typography>
                    <ActivityChart type="area" height={350} />
                  </Paper>
                </motion.div>
              </StaggerItem>
            </Grid>
            
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack spacing={3}>
                {/* Weekly Activity Chart */}
                <StaggerItem>
                  <motion.div
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Paper sx={{ 
                      p: 3,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                      }
                    }}>
                      <WeeklyActivityChart height={200} />
                    </Paper>
                  </motion.div>
                </StaggerItem>

                {/* Buildings List */}
                <StaggerItem>
                  <motion.div
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Paper sx={{ 
                      p: 3,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                      }
                    }}>
                      <Typography variant="h6" sx={{ mb: 2 }}>
                        Edificios Activos
                      </Typography>
                      <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                        {buildings?.map((building, index) => (
                          <motion.div
                            key={building.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                            whileHover={{ 
                              scale: 1.02,
                              x: 4,
                              transition: { duration: 0.2 }
                            }}
                          >
                            <Box
                              sx={{
                                p: 2,
                                mb: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  borderColor: 'primary.main',
                                  backgroundColor: 'rgba(255, 107, 53, 0.05)',
                                },
                              }}
                              onClick={() => {
                                NotificationService.info(`Accediendo a ${building.name}...`);
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
                          </motion.div>
                        ))}
                      </Box>
                    </Paper>
                  </motion.div>
                </StaggerItem>

                {/* WhatsApp Panel */}
                <StaggerItem>
                  <motion.div
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Box sx={{ height: 400 }}>
                      <WhatsAppPanel />
                    </Box>
                  </motion.div>
                </StaggerItem>
              </Stack>
            </Grid>
          </Grid>
        </StaggerContainer>
      </Box>
    </LoadingTransition>
  );
};