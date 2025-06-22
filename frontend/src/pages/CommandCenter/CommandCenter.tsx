import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Stack,
  LinearProgress,
} from '@mui/material';
import {
  Fullscreen,
  FullscreenExit,
  VolumeUp,
  VolumeOff,
  CheckCircle,
  Error,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { format, subMinutes } from 'date-fns';

// Types for monitor content
interface MonitorData {
  id: number;
  title: string;
  type: 'camera' | 'chart' | 'alerts' | 'heatmap' | 'stats' | 'network';
  status: 'online' | 'offline' | 'warning';
  content?: any;
}

interface Alert {
  id: string;
  type: 'security' | 'system' | 'access';
  message: string;
  time: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// Generate mock data for real-time charts
const generateRealtimeData = (points: number = 20) => {
  const data = [];
  const now = new Date();
  
  for (let i = points - 1; i >= 0; i--) {
    const time = subMinutes(now, i * 2);
    data.push({
      time: format(time, 'HH:mm'),
      value: Math.floor(Math.random() * 100) + 20,
      events: Math.floor(Math.random() * 50) + 10,
      network: 85 + Math.random() * 15,
    });
  }
  
  return data;
};

// Generate mock alerts
const generateAlerts = (): Alert[] => {
  const messages = [
    'Acceso no autorizado detectado en Entrada Principal',
    'Cámara 7 desconectada - Sector B',
    'Movimiento detectado en área restringida',
    'Sistema de respaldo activado',
    'Alerta de seguridad - Piso 3',
    'Conexión de red inestable - Edificio Norte',
    'Mantenimiento programado completado',
    'Nuevo usuario registrado en el sistema',
    'Actividad inusual en horario nocturno',
    'Batería baja en sensor 15',
  ];
  
  const types: Array<'security' | 'system' | 'access'> = ['security', 'system', 'access'];
  const priorities: Array<'low' | 'medium' | 'high' | 'critical'> = ['low', 'medium', 'high', 'critical'];
  
  return Array.from({ length: 50 }, (_, i) => ({
    id: `alert-${i}`,
    type: types[Math.floor(Math.random() * types.length)],
    message: messages[Math.floor(Math.random() * messages.length)],
    time: new Date(Date.now() - Math.random() * 3600000),
    priority: priorities[Math.floor(Math.random() * priorities.length)],
  }));
};

// Generate heatmap data
const generateHeatmapData = () => {
  return Array.from({ length: 100 }, (_, i) => ({
    x: i % 10,
    y: Math.floor(i / 10),
    value: Math.random(),
  }));
};

// Simulated camera feed component
const CameraFeed: React.FC<{ cameraId: number; isMaximized: boolean }> = ({ cameraId, isMaximized }) => {
  const [isOnline, setIsOnline] = useState(true);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setIsOnline(Math.random() > 0.1); // 90% uptime
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: '#1A1A1A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {isOnline ? (
        <>
          {/* Simulated video feed with moving rectangles */}
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #2A2A2A 0%, #1A1A1A 50%, #000000 100%)',
            }}
          >
            {/* Moving objects simulation */}
            {Array.from({ length: 3 }).map((_, i) => (
              <motion.div
                key={i}
                style={{
                  position: 'absolute',
                  width: 20,
                  height: 20,
                  backgroundColor: '#FF6B35',
                  borderRadius: '50%',
                  opacity: 0.6,
                }}
                animate={{
                  x: [0, 200, 0],
                  y: [0, 100, 150, 0],
                }}
                transition={{
                  duration: 8 + i * 2,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
            ))}
            
            {/* Grid overlay */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: `
                  linear-gradient(rgba(255,107,53,0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,107,53,0.1) 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px',
              }}
            />
          </Box>
          
          {/* Camera info overlay */}
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              color: '#1A1A1A',
              fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
              fontSize: isMaximized ? 16 : 12,
              textShadow: 'none',
            }}
          >
            CAM-{String(cameraId).padStart(2, '0')}
          </Box>
          
          {/* Recording indicator */}
          <motion.div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 8,
              height: 8,
              backgroundColor: '#ff0000',
              borderRadius: '50%',
            }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          
          {/* Timestamp */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              color: '#1A1A1A',
              fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
              fontSize: isMaximized ? 14 : 10,
              textShadow: 'none',
            }}
          >
            {format(new Date(), 'HH:mm:ss')}
          </Box>
        </>
      ) : (
        <Box
          sx={{
            textAlign: 'center',
            color: '#ff0000',
            fontFamily: 'monospace',
          }}
        >
          <Error sx={{ fontSize: 40, mb: 1 }} />
          <Typography variant="body2">SIGNAL LOST</Typography>
          <Typography variant="caption">CAM-{String(cameraId).padStart(2, '0')}</Typography>
        </Box>
      )}
    </Box>
  );
};

// Real-time chart component
const RealtimeChart: React.FC<{ type: 'line' | 'area' | 'bar'; title: string }> = ({ type, title }) => {
  const [data, setData] = useState(generateRealtimeData());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setData(generateRealtimeData());
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);
  
  const renderChart = (): React.ReactElement => {
    const commonProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };
    
    switch (type) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <XAxis dataKey="time" tick={{ fill: '#666', fontSize: 10 }} />
            <YAxis tick={{ fill: '#666', fontSize: 10 }} />
            <Line type="monotone" dataKey="value" stroke="#FF6B35" strokeWidth={2} dot={false} />
          </LineChart>
        );
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#FF6B35" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" tick={{ fill: '#666', fontSize: 10 }} />
            <YAxis tick={{ fill: '#666', fontSize: 10 }} />
            <Area type="monotone" dataKey="events" stroke="#FF6B35" fillOpacity={1} fill="url(#colorGradient)" />
          </AreaChart>
        );
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <XAxis dataKey="time" tick={{ fill: '#666', fontSize: 10 }} />
            <YAxis tick={{ fill: '#666', fontSize: 10 }} />
            <Bar dataKey="network" fill="#FF6B35" opacity={0.8} />
          </BarChart>
        );
      default:
        return <div>Chart not available</div>;
    }
  };
  
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: '#1A1A1A',
        border: '1px solid rgba(255, 107, 53, 0.3)',
        p: 1,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: '#FF6B35',
          fontFamily: 'monospace',
          textShadow: '0 0 5px #00ff00',
          mb: 1,
          display: 'block',
        }}
      >
        {title}
      </Typography>
      <ResponsiveContainer width="100%" height="85%">
        {renderChart()}
      </ResponsiveContainer>
    </Box>
  );
};

// Scrolling alerts component
const ScrollingAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>(generateAlerts());
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setAlerts(prev => {
        const newAlert: Alert = {
          id: `alert-${Date.now()}`,
          type: ['security', 'system', 'access'][Math.floor(Math.random() * 3)] as any,
          message: 'Nueva alerta detectada en el sistema',
          time: new Date(),
          priority: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as any,
        };
        return [newAlert, ...prev.slice(0, 49)];
      });
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  const getAlertColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#F44336';
      case 'high': return '#FF9800';
      case 'medium': return '#FFC107';
      default: return '#4CAF50';
    }
  };
  
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: '#1A1A1A',
        border: '1px solid rgba(255, 107, 53, 0.3)',
        overflow: 'hidden',
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: '#FF6B35',
          fontFamily: 'monospace',
          textShadow: '0 0 5px #00ff00',
          p: 1,
          borderBottom: '1px solid #00ff00',
          display: 'block',
        }}
      >
        SISTEMA DE ALERTAS
      </Typography>
      
      <Box
        ref={scrollRef}
        sx={{
          height: 'calc(100% - 30px)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <motion.div
          animate={{ y: [-20, -alerts.length * 25] }}
          transition={{
            duration: alerts.length * 2,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{
            position: 'absolute',
            width: '100%',
          }}
        >
          {alerts.map((alert, index) => (
            <Box
              key={`${alert.id}-${index}`}
              sx={{
                p: 1,
                borderBottom: '1px solid rgba(0,255,0,0.2)',
                height: 25,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Box
                component="span"
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: getAlertColor(alert.priority),
                  mr: 1,
                  flexShrink: 0,
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  color: '#1A1A1A',
                  fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
                  fontSize: 10,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {format(alert.time, 'HH:mm')} - {alert.message}
              </Typography>
            </Box>
          ))}
        </motion.div>
      </Box>
    </Box>
  );
};

// Activity heatmap component
const ActivityHeatmap: React.FC = () => {
  const [heatmapData, setHeatmapData] = useState(generateHeatmapData());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setHeatmapData(generateHeatmapData());
    }, 4000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: '#1A1A1A',
        border: '1px solid rgba(255, 107, 53, 0.3)',
        p: 1,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: '#FF6B35',
          fontFamily: 'monospace',
          textShadow: '0 0 5px #00ff00',
          mb: 1,
          display: 'block',
        }}
      >
        MAPA DE CALOR - ACTIVIDAD
      </Typography>
      
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(10, 1fr)',
          gridTemplateRows: 'repeat(10, 1fr)',
          gap: 1,
          height: 'calc(100% - 30px)',
        }}
      >
        {heatmapData.map((cell, index) => (
          <motion.div
            key={index}
            style={{
              backgroundColor: `rgba(0, 255, 0, ${cell.value})`,
              borderRadius: 2,
            }}
            animate={{
              backgroundColor: `rgba(0, 255, 0, ${cell.value})`,
            }}
            transition={{ duration: 0.5 }}
          />
        ))}
      </Box>
    </Box>
  );
};

// System stats component
const SystemStats: React.FC = () => {
  const [stats, setStats] = useState({
    cpu: 45,
    memory: 62,
    network: 89,
    storage: 34,
  });
  
  useEffect(() => {
    const interval = setInterval(() => {
      setStats({
        cpu: 30 + Math.random() * 40,
        memory: 50 + Math.random() * 30,
        network: 80 + Math.random() * 20,
        storage: 30 + Math.random() * 20,
      });
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: '#1A1A1A',
        border: '1px solid rgba(255, 107, 53, 0.3)',
        p: 1,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: '#FF6B35',
          fontFamily: 'monospace',
          textShadow: '0 0 5px #00ff00',
          mb: 2,
          display: 'block',
        }}
      >
        ESTADO DEL SISTEMA
      </Typography>
      
      <Stack spacing={2}>
        {Object.entries(stats).map(([key, value]) => (
          <Box key={key}>
            <Typography
              variant="caption"
              sx={{
                color: '#1A1A1A',
                fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
                fontSize: 10,
                textTransform: 'uppercase',
              }}
            >
              {key}: {Math.round(value)}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={value}
              sx={{
                backgroundColor: 'rgba(255, 107, 53, 0.1)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: value > 80 ? '#F44336' : value > 60 ? '#FF9800' : '#4CAF50',
                },
                height: 4,
                borderRadius: 2,
              }}
            />
          </Box>
        ))}
      </Stack>
    </Box>
  );
};


// Main Command Center component
export const CommandCenter: React.FC = () => {
  const [monitors] = useState<MonitorData[]>([
    { id: 1, title: 'Entrada Principal', type: 'camera', status: 'online' },
    { id: 2, title: 'Actividad en Tiempo Real', type: 'chart', status: 'online' },
    { id: 3, title: 'Estacionamiento', type: 'camera', status: 'online' },
    { id: 4, title: 'Alertas del Sistema', type: 'alerts', status: 'online' },
    { id: 5, title: 'Pasillo Principal', type: 'camera', status: 'warning' },
    { id: 6, title: 'Mapa de Calor', type: 'heatmap', status: 'online' },
    { id: 7, title: 'Área de Recepción', type: 'camera', status: 'online' },
    { id: 8, title: 'Estado del Sistema', type: 'stats', status: 'online' },
    { id: 9, title: 'Red y Conectividad', type: 'chart', status: 'online' },
  ]);
  
  const [maximizedMonitor, setMaximizedMonitor] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  useEffect(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.volume = 0.3;
      audioRef.current.play();
    } else if (audioRef.current) {
      audioRef.current.pause();
    }
  }, [soundEnabled]);
  
  const renderMonitorContent = (monitor: MonitorData, isMaximized: boolean = false) => {
    switch (monitor.type) {
      case 'camera':
        return <CameraFeed cameraId={monitor.id} isMaximized={isMaximized} />;
      case 'chart':
        return (
          <RealtimeChart
            type={monitor.id === 2 ? 'area' : monitor.id === 9 ? 'bar' : 'line'}
            title={monitor.title}
          />
        );
      case 'alerts':
        return <ScrollingAlerts />;
      case 'heatmap':
        return <ActivityHeatmap />;
      case 'stats':
        return <SystemStats />;
      default:
        return null;
    }
  };
  
  const handleMaximize = (monitorId: number) => {
    setMaximizedMonitor(maximizedMonitor === monitorId ? null : monitorId);
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#4CAF50';
      case 'warning': return '#FF9800';
      case 'offline': return '#F44336';
      default: return '#4CAF50';
    }
  };
  
  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: 'calc(100vh - 120px)',
        backgroundColor: '#F8F9FA',
        p: 2,
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          p: 2,
          backgroundColor: '#FFFFFF',
          border: '1px solid rgba(255, 107, 53, 0.2)',
          borderRadius: 2,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{
              color: '#1A1A1A',
              fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
              textShadow: 'none',
              fontWeight: 'bold',
            }}
          >
            CENTRO DE COMANDO
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{
              color: '#666',
              fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
              opacity: 0.8,
            }}
          >
            SISTEMA DE MONITOREO FORTEN • {format(new Date(), 'dd/MM/yyyy HH:mm:ss')}
          </Typography>
        </Box>
        
        <Stack direction="row" spacing={2} alignItems="center">
          <Chip
            icon={<CheckCircle />}
            label="SISTEMAS OPERATIVOS"
            sx={{
              backgroundColor: 'rgba(255, 107, 53, 0.1)',
              color: '#1A1A1A',
              border: '1px solid rgba(255, 107, 53, 0.3)',
              fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
            }}
          />
          
          <IconButton
            onClick={() => setSoundEnabled(!soundEnabled)}
            sx={{
              color: '#1A1A1A',
              border: '1px solid rgba(255, 107, 53, 0.3)',
              '&:hover': {
                backgroundColor: 'rgba(255, 107, 53, 0.1)',
              },
            }}
          >
            {soundEnabled ? <VolumeUp /> : <VolumeOff />}
          </IconButton>
        </Stack>
      </Box>
      
      {/* Monitor Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: maximizedMonitor ? '1fr' : 'repeat(3, 1fr)',
          gridTemplateRows: maximizedMonitor ? '1fr' : 'repeat(3, 1fr)',
          gap: 2,
          height: maximizedMonitor ? '70vh' : '75vh',
          position: 'relative',
        }}
      >
        <AnimatePresence>
          {monitors
            .filter(monitor => !maximizedMonitor || monitor.id === maximizedMonitor)
            .map((monitor) => (
              <motion.div
                key={monitor.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                style={{
                  position: 'relative',
                  backgroundColor: '#FFFFFF',
                  border: `2px solid ${getStatusColor(monitor.status)}`,
                  borderRadius: 8,
                  overflow: 'hidden',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                }}
              >
                {/* Monitor Header */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 30,
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    px: 1,
                    zIndex: 100,
                    borderBottom: `1px solid ${getStatusColor(monitor.status)}`,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: getStatusColor(monitor.status),
                      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
                      textShadow: `0 0 5px ${getStatusColor(monitor.status)}`,
                      fontWeight: 'bold',
                    }}
                  >
                    [{monitor.id}] {monitor.title}
                  </Typography>
                  
                  <IconButton
                    size="small"
                    onClick={() => handleMaximize(monitor.id)}
                    sx={{
                      color: getStatusColor(monitor.status),
                      p: 0.5,
                    }}
                  >
                    {maximizedMonitor === monitor.id ? <FullscreenExit /> : <Fullscreen />}
                  </IconButton>
                </Box>
                
                {/* Monitor Content */}
                <Box sx={{ height: '100%', pt: '30px' }}>
                  {renderMonitorContent(monitor, maximizedMonitor === monitor.id)}
                </Box>
                
                {/* Status Indicator */}
                <motion.div
                  style={{
                    position: 'absolute',
                    bottom: 8,
                    left: 8,
                    width: 8,
                    height: 8,
                    backgroundColor: getStatusColor(monitor.status),
                    borderRadius: '50%',
                    zIndex: 100,
                  }}
                  animate={{
                    opacity: monitor.status === 'online' ? [1, 0.5, 1] : 1,
                  }}
                  transition={{
                    duration: 2,
                    repeat: monitor.status === 'online' ? Infinity : 0,
                  }}
                />
              </motion.div>
            ))}
        </AnimatePresence>
      </Box>
      
      {/* Ambient Sound - Simulated computer room ambience */}
      <audio
        ref={audioRef}
        loop
        preload="none"
      >
        {/* Base64 encoded silent audio for ambient effect placeholder */}
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSMFL4NO89iNOAkaaLvt559NEAxQp+PwtmMcBjiR1/LMeSMFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSMFL4NO89iNOAkaaLvt559NEAxQp+PwtmMcBjiR1/LMeSMFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSMFL4NO89iNOAkaaLvt559N" />
      </audio>
    </Box>
  );
};