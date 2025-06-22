import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Avatar,
  IconButton,
  Stack,
  Badge,
  LinearProgress,
  Divider,
  Collapse,
  Button,
  Paper,
} from '@mui/material';
import {
  Warning,
  Security,
  DirectionsCar,
  Person,
  Pets,
  LocalShipping,
  ExpandMore,
  ExpandLess,
  PlayArrow,
  Pause,
  VolumeUp,
  VolumeOff,
  FilterList,
  Timeline,
  SmartToy,
} from '@mui/icons-material';
import { useSpring, animated, useTransition } from '@react-spring/web';
import { format, subMinutes, differenceInMinutes, isSameHour } from 'date-fns';
import NotificationService from '../../services/notificationService';

// Types for AI Alert System
interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  label: string;
  id: string;
}

interface AIAlert {
  id: string;
  type: 'person' | 'vehicle' | 'object' | 'animal' | 'unauthorized_access' | 'suspicious_behavior';
  title: string;
  description: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  location: string;
  cameraId: string;
  imageUrl?: string;
  boundingBoxes: BoundingBox[];
  mlClassification: {
    primary: string;
    secondary: string[];
    confidence: number;
  };
  status: 'new' | 'acknowledged' | 'investigating' | 'resolved';
  groupId?: string;
}

interface AlertGroup {
  id: string;
  type: AIAlert['type'];
  location: string;
  alerts: AIAlert[];
  timeRange: {
    start: Date;
    end: Date;
  };
  severity: AIAlert['severity'];
}

// Simulated ML Classification Engine
const classifyAlert = (type: AIAlert['type'], confidence: number): AIAlert['mlClassification'] => {
  const classifications = {
    person: {
      primary: 'Human Detection',
      secondary: ['Pedestrian', 'Staff Member', 'Visitor', 'Intruder'],
      baseConfidence: 0.92,
    },
    vehicle: {
      primary: 'Vehicle Detection',
      secondary: ['Car', 'Truck', 'Motorcycle', 'Delivery Van'],
      baseConfidence: 0.88,
    },
    unauthorized_access: {
      primary: 'Security Breach',
      secondary: ['Forced Entry', 'Tailgating', 'After Hours Access'],
      baseConfidence: 0.95,
    },
    suspicious_behavior: {
      primary: 'Behavioral Analysis',
      secondary: ['Loitering', 'Unusual Movement', 'Restricted Area'],
      baseConfidence: 0.82,
    },
    object: {
      primary: 'Object Recognition',
      secondary: ['Package', 'Bag', 'Equipment', 'Unknown Item'],
      baseConfidence: 0.78,
    },
    animal: {
      primary: 'Animal Detection',
      secondary: ['Dog', 'Cat', 'Bird', 'Wildlife'],
      baseConfidence: 0.85,
    },
  };

  const config = classifications[type];
  const mlConfidence = Math.min(0.99, config.baseConfidence + (Math.random() - 0.5) * 0.1);
  
  return {
    primary: config.primary,
    secondary: config.secondary,
    confidence: mlConfidence,
  };
};

// Generate realistic bounding boxes
const generateBoundingBoxes = (type: AIAlert['type'], count: number = 1): BoundingBox[] => {
  const boxes: BoundingBox[] = [];
  
  for (let i = 0; i < count; i++) {
    const baseConfidence = type === 'person' ? 0.9 : type === 'vehicle' ? 0.85 : 0.75;
    boxes.push({
      id: `bbox-${Date.now()}-${i}`,
      x: Math.random() * 60 + 10, // 10-70% from left
      y: Math.random() * 60 + 10, // 10-70% from top
      width: Math.random() * 25 + 15, // 15-40% width
      height: Math.random() * 25 + 15, // 15-40% height
      confidence: baseConfidence + (Math.random() - 0.5) * 0.2,
      label: type === 'person' ? 'Person' : type === 'vehicle' ? 'Vehicle' : 'Object',
    });
  }
  
  return boxes;
};

// Generate mock alerts with AI characteristics
const generateMockAlerts = (count: number = 50): AIAlert[] => {
  const alertTypes: AIAlert['type'][] = [
    'person',
    'vehicle',
    'unauthorized_access',
    'suspicious_behavior',
    'object',
    'animal',
  ];
  
  const locations = [
    'Entrada Principal',
    'Estacionamiento Norte',
    'Pasillo Sector A',
    'Área de Recepción',
    'Salida de Emergencia',
    'Perímetro Exterior',
    'Ascensor Principal',
    'Terraza Edificio',
  ];
  
  const cameras = ['CAM-001', 'CAM-002', 'CAM-003', 'CAM-004', 'CAM-005'];
  
  return Array.from({ length: count }, (_, i) => {
    const type = alertTypes[Math.floor(Math.random() * alertTypes.length)];
    const confidence = 0.7 + Math.random() * 0.3; // 70-100%
    const timestamp = subMinutes(new Date(), Math.random() * 480); // Last 8 hours
    
    // Determine severity based on type and confidence
    let severity: AIAlert['severity'] = 'low';
    if (type === 'unauthorized_access' || confidence > 0.95) severity = 'critical';
    else if (type === 'suspicious_behavior' || confidence > 0.85) severity = 'high';
    else if (confidence > 0.75) severity = 'medium';
    
    const alert: AIAlert = {
      id: `alert-${Date.now()}-${i}`,
      type,
      title: generateAlertTitle(type),
      description: generateAlertDescription(type),
      confidence,
      severity,
      timestamp,
      location: locations[Math.floor(Math.random() * locations.length)],
      cameraId: cameras[Math.floor(Math.random() * cameras.length)],
      boundingBoxes: generateBoundingBoxes(type, Math.random() > 0.7 ? 2 : 1),
      mlClassification: classifyAlert(type, confidence),
      status: Math.random() > 0.3 ? 'new' : 'acknowledged',
    };
    
    return alert;
  }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

const generateAlertTitle = (type: AIAlert['type']): string => {
  const titles = {
    person: ['Persona detectada en área restringida', 'Movimiento humano identificado', 'Acceso de persona no autorizada'],
    vehicle: ['Vehículo no autorizado detectado', 'Entrada de vehículo fuera de horario', 'Vehículo en zona prohibida'],
    unauthorized_access: ['Intento de acceso no autorizado', 'Acceso forzado detectado', 'Entrada sin credenciales'],
    suspicious_behavior: ['Comportamiento sospechoso detectado', 'Actividad inusual identificada', 'Patrón de movimiento anómalo'],
    object: ['Objeto abandonado detectado', 'Paquete no identificado', 'Elemento extraño en el área'],
    animal: ['Animal detectado en las instalaciones', 'Presencia de fauna en el perímetro', 'Mascota en área restringida'],
  };
  
  const typeTitle = titles[type];
  return typeTitle[Math.floor(Math.random() * typeTitle.length)];
};

const generateAlertDescription = (type: AIAlert['type']): string => {
  const descriptions = {
    person: [
      'Sistema de IA detectó presencia humana con alta precisión',
      'Análisis de patrones de movimiento indica actividad no autorizada',
      'Reconocimiento facial no coincide con base de datos autorizada',
    ],
    vehicle: [
      'Placa vehicular no registrada en sistema de acceso',
      'Vehículo detectado en horario no permitido para esta zona',
      'Análisis de características vehiculares indica posible infracción',
    ],
    unauthorized_access: [
      'Sensor de acceso activado sin credencial válida',
      'Intento de apertura forzada detectado por sensores',
      'Actividad en punto de acceso fuera del horario autorizado',
    ],
    suspicious_behavior: [
      'Algoritmo de análisis conductual detectó patrones anómalos',
      'Tiempo de permanencia excede parámetros normales',
      'Movimientos repetitivos en área sensible detectados',
    ],
    object: [
      'Objeto estacionario detectado por más de 10 minutos',
      'Análisis de forma indica posible paquete abandonado',
      'Item no identificado en área de seguridad',
    ],
    animal: [
      'Clasificador de especies detectó presencia animal',
      'Movimiento característico de fauna silvestre',
      'Animal doméstico en área no permitida',
    ],
  };
  
  const typeDesc = descriptions[type];
  return typeDesc[Math.floor(Math.random() * typeDesc.length)];
};

// Intelligent alert grouping
const groupAlerts = (alerts: AIAlert[]): AlertGroup[] => {
  const groups: { [key: string]: AlertGroup } = {};
  
  alerts.forEach(alert => {
    // Group by type, location, and time proximity (within 30 minutes)
    const groupKey = `${alert.type}-${alert.location}`;
    
    if (!groups[groupKey]) {
      groups[groupKey] = {
        id: `group-${groupKey}-${Date.now()}`,
        type: alert.type,
        location: alert.location,
        alerts: [],
        timeRange: {
          start: alert.timestamp,
          end: alert.timestamp,
        },
        severity: alert.severity,
      };
    }
    
    const group = groups[groupKey];
    const timeDiff = Math.abs(differenceInMinutes(alert.timestamp, group.timeRange.start));
    
    if (timeDiff <= 30) {
      group.alerts.push(alert);
      alert.groupId = group.id;
      
      // Update time range
      if (alert.timestamp < group.timeRange.start) {
        group.timeRange.start = alert.timestamp;
      }
      if (alert.timestamp > group.timeRange.end) {
        group.timeRange.end = alert.timestamp;
      }
      
      // Update severity to highest
      const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
      if (severityLevels[alert.severity] > severityLevels[group.severity]) {
        group.severity = alert.severity;
      }
    } else {
      // Create new group for alerts outside time window
      const newGroupKey = `${groupKey}-${alert.timestamp.getTime()}`;
      groups[newGroupKey] = {
        id: `group-${newGroupKey}`,
        type: alert.type,
        location: alert.location,
        alerts: [alert],
        timeRange: {
          start: alert.timestamp,
          end: alert.timestamp,
        },
        severity: alert.severity,
      };
      alert.groupId = groups[newGroupKey].id;
    }
  });
  
  return Object.values(groups).sort((a, b) => 
    b.timeRange.end.getTime() - a.timeRange.end.getTime()
  );
};

// Alert type configurations
const getAlertConfig = (type: AIAlert['type']) => {
  const configs = {
    person: {
      icon: <Person />,
      color: '#2196F3',
      bgColor: 'rgba(33, 150, 243, 0.1)',
      sound: 'person-detected.wav',
    },
    vehicle: {
      icon: <DirectionsCar />,
      color: '#FF9800',
      bgColor: 'rgba(255, 152, 0, 0.1)',
      sound: 'vehicle-alert.wav',
    },
    unauthorized_access: {
      icon: <Security />,
      color: '#F44336',
      bgColor: 'rgba(244, 67, 54, 0.1)',
      sound: 'security-breach.wav',
    },
    suspicious_behavior: {
      icon: <Warning />,
      color: '#FF6B35',
      bgColor: 'rgba(255, 107, 53, 0.1)',
      sound: 'suspicious-activity.wav',
    },
    object: {
      icon: <LocalShipping />,
      color: '#9C27B0',
      bgColor: 'rgba(156, 39, 176, 0.1)',
      sound: 'object-detected.wav',
    },
    animal: {
      icon: <Pets />,
      color: '#4CAF50',
      bgColor: 'rgba(76, 175, 80, 0.1)',
      sound: 'animal-detected.wav',
    },
  };
  
  return configs[type];
};

// Severity configurations
const getSeverityConfig = (severity: AIAlert['severity']) => {
  const configs = {
    low: { color: '#4CAF50', label: 'Baja', priority: 1 },
    medium: { color: '#FF9800', label: 'Media', priority: 2 },
    high: { color: '#FF6B35', label: 'Alta', priority: 3 },
    critical: { color: '#F44336', label: 'Crítica', priority: 4 },
  };
  
  return configs[severity];
};

// Animated Bounding Box Component
const AnimatedBoundingBox: React.FC<{
  box: BoundingBox;
  isVisible: boolean;
}> = ({ box, isVisible }) => {
  const springProps = useSpring({
    opacity: isVisible ? 1 : 0,
    scale: isVisible ? 1 : 0.8,
    config: { tension: 200, friction: 20 },
  });
  
  const pulseProps = useSpring({
    from: { borderWidth: 2 },
    to: { borderWidth: 4 },
    loop: { reverse: true },
    config: { duration: 1000 },
  });
  
  return (
    <animated.div
      style={{
        position: 'absolute',
        left: `${box.x}%`,
        top: `${box.y}%`,
        width: `${box.width}%`,
        height: `${box.height}%`,
        border: `${pulseProps.borderWidth}px solid #FF6B35`,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 107, 53, 0.1)',
        pointerEvents: 'none',
        ...springProps,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: -25,
          left: 0,
          backgroundColor: '#FF6B35',
          color: 'white',
          px: 1,
          py: 0.5,
          borderRadius: 1,
          fontSize: '0.75rem',
          fontWeight: 'bold',
        }}
      >
        {box.label} {(box.confidence * 100).toFixed(0)}%
      </Box>
    </animated.div>
  );
};

// Alert Preview Component
const AlertPreview: React.FC<{
  alert: AIAlert;
  expanded: boolean;
}> = ({ alert, expanded }) => {
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  
  const config = getAlertConfig(alert.type);
  
  return (
    <Collapse in={expanded}>
      <Box sx={{ p: 2, pt: 1 }}>
        <Stack spacing={2}>
          {/* Image Preview with Bounding Boxes */}
          <Box
            sx={{
              position: 'relative',
              height: 200,
              backgroundColor: '#f5f5f5',
              borderRadius: 2,
              overflow: 'hidden',
              background: 'linear-gradient(135deg, #1E2328 0%, #0F1419 50%, #000000 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Simulated camera feed background */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: `
                  linear-gradient(rgba(255,107,53,0.05) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,107,53,0.05) 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px',
              }}
            />
            
            {/* Simulated objects in scene */}
            <Box
              sx={{
                position: 'absolute',
                width: '80%',
                height: '80%',
                background: 'radial-gradient(circle, rgba(255,107,53,0.2) 0%, transparent 70%)',
                borderRadius: '50%',
              }}
            />
            
            {/* Bounding Boxes */}
            {alert.boundingBoxes.map((box) => (
              <AnimatedBoundingBox
                key={box.id}
                box={box}
                isVisible={showBoundingBoxes}
              />
            ))}
            
            {/* Camera Info Overlay */}
            <Box
              sx={{
                position: 'absolute',
                top: 8,
                left: 8,
                color: '#FF6B35',
                fontFamily: 'monospace',
                fontSize: 12,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                px: 1,
                py: 0.5,
                borderRadius: 1,
              }}
            >
              {alert.cameraId} • {format(alert.timestamp, 'HH:mm:ss')}
            </Box>
            
            {/* Toggle Bounding Boxes */}
            <IconButton
              size="small"
              onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: '#FF6B35',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.9)',
                },
              }}
            >
              <FilterList />
            </IconButton>
          </Box>
          
          {/* ML Classification Results */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              backgroundColor: 'rgba(255, 107, 53, 0.08)',
              border: '1px solid rgba(255, 107, 53, 0.3)',
              borderRadius: 2,
            }}
          >
            <Stack spacing={1}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <SmartToy sx={{ color: '#FF6B35', fontSize: 20 }} />
                <Typography variant="subtitle2" fontWeight="bold">
                  Análisis de IA
                </Typography>
              </Stack>
              
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Clasificación Principal:
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {alert.mlClassification.primary}
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Confianza del Modelo:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={alert.mlClassification.confidence * 100}
                    sx={{
                      flexGrow: 1,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: 'rgba(255, 107, 53, 0.1)',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: '#FF6B35',
                      },
                    }}
                  />
                  <Typography variant="body2" fontWeight="bold">
                    {(alert.mlClassification.confidence * 100).toFixed(1)}%
                  </Typography>
                </Box>
              </Box>
              
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Clasificaciones Secundarias:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {alert.mlClassification.secondary.map((classification, index) => (
                    <Chip
                      key={index}
                      label={classification}
                      size="small"
                      sx={{
                        backgroundColor: config.bgColor,
                        color: config.color,
                        border: `1px solid ${config.color}30`,
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            </Stack>
          </Paper>
        </Stack>
      </Box>
    </Collapse>
  );
};

// Individual Alert Card Component
const AlertCard: React.FC<{
  alert: AIAlert;
  onPlaySound: (type: AIAlert['type']) => void;
}> = ({ alert, onPlaySound }) => {
  const [expanded, setExpanded] = useState(false);
  
  const config = getAlertConfig(alert.type);
  const severityConfig = getSeverityConfig(alert.severity);
  
  const cardSpring = useSpring({
    from: { opacity: 0, transform: 'translateY(20px)' },
    to: { opacity: 1, transform: 'translateY(0px)' },
    config: { tension: 200, friction: 20 },
  });
  
  return (
    <animated.div style={cardSpring}>
      <Card
        sx={{
          mb: 2,
          border: `1px solid ${severityConfig.color}40`,
          borderLeft: `4px solid ${severityConfig.color}`,
          backgroundColor: 'background.paper',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          '&:hover': {
            boxShadow: `0 4px 20px ${config.color}20`,
          },
        }}
      >
        <CardContent sx={{ pb: expanded ? 0 : 2 }}>
          <Stack spacing={2}>
            {/* Alert Header */}
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar
                sx={{
                  backgroundColor: config.color,
                  width: 40,
                  height: 40,
                }}
              >
                {config.icon}
              </Avatar>
              
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6" fontWeight="bold">
                  {alert.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {alert.location} • {alert.cameraId}
                </Typography>
              </Box>
              
              <Stack alignItems="center" spacing={1}>
                <Chip
                  label={severityConfig.label}
                  size="small"
                  sx={{
                    backgroundColor: severityConfig.color,
                    color: 'white',
                    fontWeight: 'bold',
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  {format(alert.timestamp, 'HH:mm')}
                </Typography>
              </Stack>
            </Stack>
            
            {/* Confidence and Actions */}
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Confianza: {(alert.confidence * 100).toFixed(1)}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={alert.confidence * 100}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: 'rgba(0, 0, 0, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: config.color,
                    },
                  }}
                />
              </Box>
              
              <IconButton
                size="small"
                onClick={() => onPlaySound(alert.type)}
                sx={{ color: config.color }}
              >
                <PlayArrow />
              </IconButton>
              
              <IconButton
                size="small"
                onClick={() => setExpanded(!expanded)}
                sx={{ color: config.color }}
              >
                {expanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Stack>
            
            {/* Alert Description */}
            <Typography variant="body2">
              {alert.description}
            </Typography>
          </Stack>
        </CardContent>
        
        {/* Expandable Preview */}
        <AlertPreview alert={alert} expanded={expanded} />
      </Card>
    </animated.div>
  );
};

// Alert Group Component
const AlertGroupCard: React.FC<{
  group: AlertGroup;
  onPlaySound: (type: AIAlert['type']) => void;
}> = ({ group, onPlaySound }) => {
  const [expanded, setExpanded] = useState(false);
  
  const config = getAlertConfig(group.type);
  const severityConfig = getSeverityConfig(group.severity);
  
  const groupSpring = useSpring({
    from: { opacity: 0, transform: 'scale(0.95)' },
    to: { opacity: 1, transform: 'scale(1)' },
    config: { tension: 200, friction: 20 },
  });
  
  return (
    <animated.div style={groupSpring}>
      <Card
        sx={{
          mb: 3,
          border: `1px solid ${severityConfig.color}40`,
          backgroundColor: 'background.paper',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
        }}
      >
        <CardContent>
          <Stack spacing={2}>
            {/* Group Header */}
            <Stack direction="row" alignItems="center" spacing={2}>
              <Badge
                badgeContent={group.alerts.length}
                color="error"
                sx={{
                  '& .MuiBadge-badge': {
                    backgroundColor: severityConfig.color,
                  },
                }}
              >
                <Avatar
                  sx={{
                    backgroundColor: config.color,
                    width: 48,
                    height: 48,
                  }}
                >
                  {config.icon}
                </Avatar>
              </Badge>
              
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6" fontWeight="bold">
                  Grupo de Alertas: {config.icon.type.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {group.location} • {group.alerts.length} alertas • 
                  {format(group.timeRange.start, 'HH:mm')} - {format(group.timeRange.end, 'HH:mm')}
                </Typography>
              </Box>
              
              <Stack alignItems="center" spacing={1}>
                <Chip
                  icon={<Timeline />}
                  label="Agrupado"
                  size="small"
                  sx={{
                    backgroundColor: '#FF6B35',
                    color: 'white',
                  }}
                />
                <IconButton
                  onClick={() => setExpanded(!expanded)}
                  sx={{ color: config.color }}
                >
                  {expanded ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Stack>
            </Stack>
          </Stack>
        </CardContent>
        
        {/* Expandable Group Content */}
        <Collapse in={expanded}>
          <Divider />
          <Box sx={{ p: 2 }}>
            <Stack spacing={2}>
              {group.alerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onPlaySound={onPlaySound}
                />
              ))}
            </Stack>
          </Box>
        </Collapse>
      </Card>
    </animated.div>
  );
};

// Main AI Alert System Component
export const AIAlertSystem: React.FC = () => {
  const [alerts, setAlerts] = useState<AIAlert[]>(generateMockAlerts(30));
  const [alertGroups] = useState<AlertGroup[]>(groupAlerts(generateMockAlerts(30)));
  const [viewMode, setViewMode] = useState<'individual' | 'grouped'>('grouped');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Simulate real-time alerts
  useEffect(() => {
    const simulateRealTimeAlerts = () => {
      const alertTypes: AIAlert['type'][] = [
        'person', 'vehicle', 'unauthorized_access', 'suspicious_behavior', 'object', 'animal'
      ];
      
      const locations = [
        'Entrada Principal', 'Estacionamiento Norte', 'Pasillo Sector A', 
        'Área de Recepción', 'Salida de Emergencia', 'Perímetro Exterior'
      ];

      const randomType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
      const randomLocation = locations[Math.floor(Math.random() * locations.length)];
      const confidence = 0.75 + Math.random() * 0.25;
      
      let severity: AIAlert['severity'] = 'low';
      if (randomType === 'unauthorized_access' || confidence > 0.95) severity = 'critical';
      else if (randomType === 'suspicious_behavior' || confidence > 0.85) severity = 'high';
      else if (confidence > 0.75) severity = 'medium';

      const newAlert: AIAlert = {
        id: `alert-${Date.now()}`,
        type: randomType,
        title: generateAlertTitle(randomType),
        description: generateAlertDescription(randomType),
        confidence,
        severity,
        timestamp: new Date(),
        location: randomLocation,
        cameraId: `CAM-${String(Math.floor(Math.random() * 5) + 1).padStart(3, '0')}`,
        boundingBoxes: generateBoundingBoxes(randomType, Math.random() > 0.7 ? 2 : 1),
        mlClassification: classifyAlert(randomType, confidence),
        status: 'new',
      };

      // Add to alerts list
      setAlerts(prev => [newAlert, ...prev.slice(0, 49)]); // Keep max 50 alerts

      // Show toast notification
      NotificationService.aiAlert({
        type: randomType,
        title: newAlert.title,
        location: randomLocation,
        confidence,
        severity,
      });

      // Play sound if enabled
      if (soundEnabled) {
        handlePlaySound(randomType);
      }
    };

    // Initial notifications
    setTimeout(() => {
      NotificationService.systemAlert('Sistema de IA iniciado correctamente', 'system');
    }, 1000);

    // Simulate new alerts every 15-30 seconds
    const interval = setInterval(() => {
      if (Math.random() > 0.3) { // 70% chance of new alert
        simulateRealTimeAlerts();
      }
    }, 15000 + Math.random() * 15000); // 15-30 seconds

    return () => clearInterval(interval);
  }, [soundEnabled]);
  
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => alert.status === 'new').slice(0, 10);
  }, [alerts]);
  
  const handlePlaySound = (type: AIAlert['type']) => {
    if (!soundEnabled) return;
    
    // Simulate different sounds for different alert types
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Different frequencies for different alert types
    const frequencies = {
      person: 800,
      vehicle: 600,
      unauthorized_access: 1000,
      suspicious_behavior: 750,
      object: 500,
      animal: 400,
    };
    
    oscillator.frequency.setValueAtTime(frequencies[type], audioContext.currentTime);
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };
  
  const alertTransitions = useTransition(
    viewMode === 'individual' ? filteredAlerts : [],
    {
      from: { opacity: 0, transform: 'translateX(-50px)' },
      enter: { opacity: 1, transform: 'translateX(0px)' },
      leave: { opacity: 0, transform: 'translateX(50px)' },
      trail: 100,
      keys: (item) => item.id,
    }
  );
  
  const groupTransitions = useTransition(
    viewMode === 'grouped' ? alertGroups : [],
    {
      from: { opacity: 0, transform: 'translateX(-50px)' },
      enter: { opacity: 1, transform: 'translateX(0px)' },
      leave: { opacity: 0, transform: 'translateX(50px)' },
      trail: 100,
      keys: (item) => item.id,
    }
  );
  
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box 
              sx={{ 
                width: 48, 
                height: 48, 
                backgroundColor: 'primary.main',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)'
              }}
            >
              <SmartToy sx={{ color: 'white', fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ mb: 0.5 }}>
                Sistema de Alertas Inteligentes
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Detección automática con IA • {alerts.length} alertas procesadas
              </Typography>
            </Box>
          </Stack>
        </Box>
        
        <Stack direction="row" spacing={2}>
          <Button
            variant={viewMode === 'individual' ? 'contained' : 'outlined'}
            onClick={() => setViewMode('individual')}
            startIcon={<FilterList />}
          >
            Individual
          </Button>
          <Button
            variant={viewMode === 'grouped' ? 'contained' : 'outlined'}
            onClick={() => setViewMode('grouped')}
            startIcon={<Timeline />}
            sx={{
              backgroundColor: viewMode === 'grouped' ? '#FF6B35' : 'transparent',
              '&:hover': {
                backgroundColor: viewMode === 'grouped' ? '#FF6B35' : 'rgba(255, 107, 53, 0.1)',
              },
            }}
          >
            Agrupado
          </Button>
          <IconButton
            onClick={() => setSoundEnabled(!soundEnabled)}
            sx={{
              color: soundEnabled ? '#FF6B35' : 'text.secondary',
              border: '1px solid',
              borderColor: soundEnabled ? '#FF6B35' : 'text.secondary',
            }}
          >
            {soundEnabled ? <VolumeUp /> : <VolumeOff />}
          </IconButton>
        </Stack>
      </Stack>
      
      {/* Alert Statistics */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" spacing={2}>
          {['critical', 'high', 'medium', 'low'].map((severity) => {
            const count = alerts.filter(a => a.severity === severity).length;
            const config = getSeverityConfig(severity as AIAlert['severity']);
            return (
              <Chip
                key={severity}
                label={`${config.label}: ${count}`}
                sx={{
                  backgroundColor: `${config.color}20`,
                  color: config.color,
                  fontWeight: 'bold',
                }}
              />
            );
          })}
        </Stack>
      </Box>
      
      {/* Alerts List */}
      <Box>
        {viewMode === 'grouped' && 
          groupTransitions((style, group) => (
            <animated.div style={style}>
              <AlertGroupCard
                group={group}
                onPlaySound={handlePlaySound}
              />
            </animated.div>
          ))
        }
        {viewMode === 'individual' && 
          alertTransitions((style, alert) => (
            <animated.div style={style}>
              <AlertCard
                alert={alert}
                onPlaySound={handlePlaySound}
              />
            </animated.div>
          ))
        }
      </Box>
      
      {/* Background Audio */}
      <audio ref={audioRef} preload="none" />
    </Box>
  );
};