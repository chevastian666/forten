import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Stack,
  Chip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Fullscreen,
  FullscreenExit,
  PlayArrow,
  Stop,
  Dashboard as DashboardIcon,
  Speed,
  Security,
  CheckCircle,
  Warning,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { fetchEventStats } from '../../store/eventSlice';
import { fetchBuildings } from '../../store/buildingSlice';
import { ActivityChart } from '../../components/ActivityChart';
import { AnimatedTimeline } from '../../components/Timeline';
import { InteractiveMap } from '../../components/Map';
import { WhatsAppPanel } from '../../components/WhatsApp';
import { DeliveryPanel } from '../../components/Delivery';
import presentationModeService from '../../services/presentationModeService';
import NotificationService from '../../services/notificationService';

const AnimatedStatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  delay?: number;
}> = ({ title, value, icon, color, delay = 0 }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (typeof value === 'number') {
      const duration = 1500;
      const steps = 30;
      const increment = value / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setDisplayValue(value);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [value]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay,
        type: 'spring',
        stiffness: 100,
      }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
    >
      <Card
        sx={{
          height: '100%',
          background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
          border: `1px solid ${color}30`,
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: `0 8px 32px ${color}20`,
            borderColor: color,
          },
        }}
      >
        <CardContent>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              >
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    backgroundColor: color,
                    color: 'white',
                    display: 'flex',
                  }}
                >
                  {icon}
                </Box>
              </motion.div>
              <Typography variant="body2" color="text.secondary">
                {title}
              </Typography>
            </Box>
            <motion.div
              key={displayValue}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <Typography variant="h3" fontWeight="bold">
                {typeof value === 'number' ? displayValue : value}
              </Typography>
            </motion.div>
          </Stack>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export const PresentationDashboard: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { stats } = useAppSelector((state) => state.events);
  const { buildings } = useAppSelector((state) => state.buildings);
  const { events } = useAppSelector((state) => state.events);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);

  useEffect(() => {
    // Load initial data
    dispatch(fetchEventStats());
    dispatch(fetchBuildings({ status: 'active' }));

    // Fullscreen change listener
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [dispatch]);

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handlePresentationMode = () => {
    if (isPresentationMode) {
      presentationModeService.stop();
      setIsPresentationMode(false);
    } else {
      presentationModeService.start({
        events: true,
        calls: true,
        access: true,
        whatsapp: true,
        interval: 3000,
      });
      setIsPresentationMode(true);
      NotificationService.success('🚀 Modo presentación activado');
    }
  };

  const activeBuildings = buildings.filter(b => b.status === 'active').length;
  const pendingEvents = events.filter(e => e.status === 'pending').length;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: 'background.default',
        p: isFullscreen ? 2 : 3,
      }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography
              variant={isFullscreen ? 'h3' : 'h4'}
              fontWeight="bold"
              sx={{
                background: 'linear-gradient(45deg, #FF6B35 30%, #FF8F65 90%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              FORTEN Security Dashboard
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Sistema de Monitoreo Inteligente
            </Typography>
          </Box>

          <Stack direction="row" spacing={2}>
            <Button
              variant={isPresentationMode ? 'outlined' : 'contained'}
              startIcon={isPresentationMode ? <Stop /> : <PlayArrow />}
              onClick={handlePresentationMode}
              color={isPresentationMode ? 'error' : 'primary'}
              size={isFullscreen ? 'large' : 'medium'}
            >
              {isPresentationMode ? 'Detener Demo' : 'Iniciar Demo'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<DashboardIcon />}
              onClick={() => navigate('/')}
            >
              Dashboard Normal
            </Button>
            <IconButton
              onClick={handleFullscreen}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
            </IconButton>
          </Stack>
        </Stack>
      </motion.div>

      <Grid container spacing={3}>
        {/* KPIs Row */}
        <Grid size={12}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <AnimatedStatCard
                title="Edificios Activos"
                value={activeBuildings}
                icon={<DashboardIcon />}
                color="#FF6B35"
                delay={0.1}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <AnimatedStatCard
                title="Eventos Hoy"
                value={stats?.todayEvents || 0}
                icon={<Speed />}
                color="#2196F3"
                delay={0.2}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <AnimatedStatCard
                title="Alertas Activas"
                value={pendingEvents}
                icon={<Warning />}
                color="#FF9800"
                delay={0.3}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <AnimatedStatCard
                title="Estado Sistema"
                value="OPERATIVO"
                icon={<CheckCircle />}
                color="#4CAF50"
                delay={0.4}
              />
            </Grid>
          </Grid>
        </Grid>

        {/* Main Content */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={3}>
            {/* Activity Chart */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Actividad en Tiempo Real
                  </Typography>
                  <ActivityChart type="area" height={300} />
                </CardContent>
              </Card>
            </motion.div>

            {/* Map */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <Box sx={{ height: 400 }}>
                <InteractiveMap />
              </Box>
            </motion.div>
          </Stack>
        </Grid>

        {/* Right Sidebar */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={3}>
            {/* Timeline */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
            >
              <Box sx={{ height: 400 }}>
                <AnimatedTimeline />
              </Box>
            </motion.div>

            {/* WhatsApp */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <Box sx={{ height: 300 }}>
                <WhatsAppPanel />
              </Box>
            </motion.div>

            {/* Delivery System */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.9 }}
            >
              <Box sx={{ height: 400 }}>
                <DeliveryPanel />
              </Box>
            </motion.div>
          </Stack>
        </Grid>
      </Grid>

      {/* Presentation Mode Indicator */}
      <AnimatePresence>
        {isPresentationMode && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            style={{
              position: 'fixed',
              bottom: 20,
              left: 20,
              zIndex: 1000,
            }}
          >
            <Chip
              label="MODO DEMO ACTIVO"
              color="error"
              icon={<PlayArrow />}
              sx={{
                py: 2,
                px: 1,
                fontSize: '1rem',
                fontWeight: 'bold',
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%': { transform: 'scale(1)' },
                  '50%': { transform: 'scale(1.05)' },
                  '100%': { transform: 'scale(1)' },
                },
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
};