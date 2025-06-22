import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Stack,
  Chip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Security,
  VpnKey,
  Warning,
  CheckCircle,
  Refresh,
  FullscreenExit,
  ArrowBack,
  Map,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { format, subMinutes } from 'date-fns';
import { useNavigate } from 'react-router-dom';

// Types for our dashboard data
interface KPIMetric {
  id: string;
  title: string;
  value: number;
  previousValue: number;
  suffix?: string;
  prefix?: string;
  icon: React.ReactNode;
  color: string;
  glowColor: string;
}

interface ActivityDataPoint {
  time: string;
  events: number;
  security: number;
  access: number;
  timestamp: number;
}

// Generate realistic mock data for real-time updates
const generateRealtimeData = (): ActivityDataPoint[] => {
  const data: ActivityDataPoint[] = [];
  const now = new Date();

  for (let i = 29; i >= 0; i--) {
    const time = subMinutes(now, i * 2); // Every 2 minutes for 1 hour
    const hour = time.getHours();
    const minute = time.getMinutes();
    
    // Simulate realistic patterns with some randomness
    let baseActivity = 5;
    if (hour >= 8 && hour <= 18) {
      baseActivity = 15 + Math.sin((hour - 8) * Math.PI / 10) * 8;
    } else if (hour >= 19 && hour <= 23) {
      baseActivity = 8 + Math.random() * 5;
    } else {
      baseActivity = 2 + Math.random() * 3;
    }

    // Add minute-level variation
    const minuteVariation = Math.sin(minute * Math.PI / 30) * 2;
    
    data.push({
      time: format(time, 'HH:mm'),
      events: Math.max(0, Math.floor(baseActivity + minuteVariation + Math.random() * 4)),
      security: Math.max(0, Math.floor((baseActivity + minuteVariation) * 0.3 + Math.random() * 2)),
      access: Math.max(0, Math.floor((baseActivity + minuteVariation) * 0.6 + Math.random() * 3)),
      timestamp: time.getTime(),
    });
  }

  return data;
};

// Generate KPI metrics with realistic variation
const generateKPIMetrics = (previous?: KPIMetric[]): KPIMetric[] => {
  const baseMetrics = [
    {
      id: 'activeConnections',
      title: 'Conexiones Activas',
      value: 1247 + Math.floor(Math.random() * 100 - 50),
      suffix: '',
      icon: <Security />,
      color: '#00E676',
      glowColor: '0, 230, 118',
    },
    {
      id: 'securityEvents',
      title: 'Eventos de Seguridad',
      value: 89 + Math.floor(Math.random() * 20 - 10),
      suffix: '',
      icon: <Warning />,
      color: '#FF6B35',
      glowColor: '255, 107, 53',
    },
    {
      id: 'systemUptime',
      title: 'Tiempo Activo',
      value: 99.97 + Math.random() * 0.02,
      suffix: '%',
      icon: <CheckCircle />,
      color: '#4CAF50',
      glowColor: '76, 175, 80',
    },
    {
      id: 'dataProcessed',
      title: 'Datos Procesados',
      value: 2.847 + Math.random() * 0.2,
      suffix: 'GB',
      icon: <VpnKey />,
      color: '#2196F3',
      glowColor: '33, 150, 243',
    },
  ];

  return baseMetrics.map((metric, index) => ({
    ...metric,
    previousValue: previous ? previous[index]?.value || metric.value : metric.value,
  }));
};

// Animated counter component
const AnimatedCounter: React.FC<{
  value: number;
  previousValue: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
}> = ({ value, previousValue, suffix = '', prefix = '', decimals = 0 }) => {
  const [displayValue, setDisplayValue] = useState(previousValue);

  useEffect(() => {
    const duration = 2000; // 2 seconds animation
    const steps = 60;
    const increment = (value - previousValue) / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      const newValue = previousValue + (increment * currentStep);
      
      if (currentStep >= steps) {
        setDisplayValue(value);
        clearInterval(interval);
      } else {
        setDisplayValue(newValue);
      }
    }, duration / steps);

    return () => clearInterval(interval);
  }, [value, previousValue]);

  const formatValue = (val: number) => {
    if (decimals > 0) {
      return val.toFixed(decimals);
    }
    return Math.floor(val).toLocaleString();
  };

  return (
    <Typography
      variant="h3"
      component={motion.div}
      sx={{
        fontWeight: 700,
        background: 'linear-gradient(45deg, #FF6B35 30%, #FF8F65 90%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        textAlign: 'center',
      }}
    >
      {prefix}{formatValue(displayValue)}{suffix}
    </Typography>
  );
};

// Percentage change indicator
const PercentageChange: React.FC<{
  current: number;
  previous: number;
  showArrow?: boolean;
}> = ({ current, previous, showArrow = true }) => {
  const change = ((current - previous) / previous) * 100;
  const isPositive = change > 0;
  const isNeutral = Math.abs(change) < 0.1;

  if (isNeutral) {
    return (
      <Chip
        size="small"
        label="Sin cambios"
        sx={{
          backgroundColor: 'rgba(158, 158, 158, 0.1)',
          color: '#9E9E9E',
        }}
      />
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Chip
        icon={
          showArrow ? (
            <motion.div
              animate={{ y: isPositive ? [-2, 2, -2] : [2, -2, 2] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {isPositive ? <TrendingUp /> : <TrendingDown />}
            </motion.div>
          ) : undefined
        }
        label={`${isPositive ? '+' : ''}${change.toFixed(1)}%`}
        size="small"
        sx={{
          backgroundColor: isPositive
            ? 'rgba(76, 175, 80, 0.1)'
            : 'rgba(244, 67, 54, 0.1)',
          color: isPositive ? '#4CAF50' : '#F44336',
          fontWeight: 600,
        }}
      />
    </motion.div>
  );
};

// KPI Card Component
const KPICard: React.FC<{
  metric: KPIMetric;
  index: number;
}> = ({ metric, index }) => {
  const isPositive = metric.value > metric.previousValue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      whileHover={{ scale: 1.02 }}
    >
      <Card
        sx={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: 3,
          overflow: 'visible',
          position: 'relative',
          boxShadow: isPositive
            ? `0 8px 32px rgba(${metric.glowColor}, 0.3)`
            : '0 8px 32px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: `0 12px 40px rgba(${metric.glowColor}, 0.4)`,
            transform: 'translateY(-2px)',
          },
        }}
      >
        {isPositive && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `linear-gradient(45deg, rgba(${metric.glowColor}, 0.1) 0%, transparent 50%)`,
              borderRadius: 3,
              pointerEvents: 'none',
            }}
          />
        )}
        
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2} alignItems="center">
            <motion.div
              animate={{
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3,
              }}
            >
              <Box
                sx={{
                  p: 2,
                  borderRadius: '50%',
                  backgroundColor: metric.color,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 4px 20px rgba(${metric.glowColor}, 0.4)`,
                }}
              >
                {metric.icon}
              </Box>
            </motion.div>

            <Typography
              variant="body2"
              color="text.secondary"
              textAlign="center"
              fontWeight={500}
            >
              {metric.title}
            </Typography>

            <AnimatedCounter
              value={metric.value}
              previousValue={metric.previousValue}
              suffix={metric.suffix}
              prefix={metric.prefix}
              decimals={metric.suffix === '%' ? 2 : 0}
            />

            <PercentageChange
              current={metric.value}
              previous={metric.previousValue}
            />
          </Stack>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <Box
        sx={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: 2,
          p: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        }}
      >
        <Typography variant="body2" fontWeight="600" sx={{ mb: 1 }}>
          {label}
        </Typography>
        {payload.map((entry: any, index: number) => (
          <Typography
            key={index}
            variant="body2"
            sx={{ color: entry.color, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: entry.color,
              }}
            />
            {entry.name}: {entry.value}
          </Typography>
        ))}
      </Box>
    );
  }
  return null;
};

export const ExecutiveDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<KPIMetric[]>(generateKPIMetrics());
  const [activityData, setActivityData] = useState<ActivityDataPoint[]>(generateRealtimeData());
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isUpdating, setIsUpdating] = useState(false);

  // Real-time data updates every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIsUpdating(true);
      
      setTimeout(() => {
        setMetrics(prev => generateKPIMetrics(prev));
        setActivityData(generateRealtimeData());
        setLastUpdate(new Date());
        setIsUpdating(false);
      }, 500);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = () => {
    setIsUpdating(true);
    setTimeout(() => {
      setMetrics(prev => generateKPIMetrics(prev));
      setActivityData(generateRealtimeData());
      setLastUpdate(new Date());
      setIsUpdating(false);
    }, 500);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        p: 3,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background decoration */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 80%, rgba(255, 107, 53, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(33, 150, 243, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(76, 175, 80, 0.05) 0%, transparent 50%)
          `,
          pointerEvents: 'none',
        }}
      />

      <Box sx={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 4 }}
          >
            <Box>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 700,
                  background: 'linear-gradient(45deg, #ffffff 30%, #f0f0f0 90%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1,
                }}
              >
                Dashboard Ejecutivo
              </Typography>
              <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                Monitoreo en Tiempo Real • FORTEN Security
              </Typography>
            </Box>

            <Stack direction="row" spacing={2} alignItems="center">
              <motion.div
                animate={{ opacity: isUpdating ? 0.5 : 1 }}
                transition={{ duration: 0.3 }}
              >
                <Typography
                  variant="body2"
                  sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                >
                  Última actualización: {format(lastUpdate, 'HH:mm:ss')}
                </Typography>
              </motion.div>

              <IconButton
                onClick={() => navigate('/')}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  },
                }}
              >
                <ArrowBack />
              </IconButton>

              <IconButton
                onClick={() => navigate('/map3d')}
                sx={{
                  backgroundColor: 'rgba(255, 107, 53, 0.2)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 107, 53, 0.3)',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 107, 53, 0.3)',
                  },
                }}
              >
                <Map />
              </IconButton>

              <IconButton
                onClick={handleManualRefresh}
                disabled={isUpdating}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  },
                }}
              >
                <motion.div
                  animate={{ rotate: isUpdating ? 360 : 0 }}
                  transition={{ duration: 1, ease: 'linear' }}
                >
                  <Refresh />
                </motion.div>
              </IconButton>
            </Stack>
          </Stack>
        </motion.div>

        {/* KPI Cards */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: '1fr 1fr',
              md: '1fr 1fr 1fr 1fr',
            },
            gap: 3,
            mb: 4,
          }}
        >
          {metrics.map((metric, index) => (
            <KPICard key={metric.id} metric={metric} index={index} />
          ))}
        </Box>

        {/* Activity Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card
            sx={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 3,
              p: 3,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            }}
          >
            <Typography
              variant="h5"
              sx={{
                mb: 3,
                fontWeight: 600,
                color: 'white',
              }}
            >
              Actividad en Tiempo Real
            </Typography>

            <Box sx={{ height: 300 }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activityData[0]?.timestamp}
                  initial={{ opacity: 0.8 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0.8 }}
                  transition={{ duration: 0.5 }}
                  style={{ height: '100%' }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={activityData}>
                      <defs>
                        <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#FF6B35" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="colorSecurity" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#4CAF50" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="colorAccess" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2196F3" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#2196F3" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                      <XAxis
                        dataKey="time"
                        stroke="rgba(255, 255, 255, 0.7)"
                        fontSize={12}
                      />
                      <YAxis stroke="rgba(255, 255, 255, 0.7)" fontSize={12} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="events"
                        stackId="1"
                        stroke="#FF6B35"
                        strokeWidth={2}
                        fill="url(#colorEvents)"
                        name="Eventos"
                      />
                      <Area
                        type="monotone"
                        dataKey="security"
                        stackId="2"
                        stroke="#4CAF50"
                        strokeWidth={2}
                        fill="url(#colorSecurity)"
                        name="Seguridad"
                      />
                      <Area
                        type="monotone"
                        dataKey="access"
                        stackId="3"
                        stroke="#2196F3"
                        strokeWidth={2}
                        fill="url(#colorAccess)"
                        name="Accesos"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </motion.div>
              </AnimatePresence>
            </Box>
          </Card>
        </motion.div>
      </Box>
    </Box>
  );
};