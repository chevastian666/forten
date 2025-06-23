import React, { useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  IconButton,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/lab';
import {
  Security,
  DoorFront,
  Warning,
  Build,
  Error as ErrorIcon,
  CheckCircle,
  Refresh,
  Circle,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAppSelector } from '../../hooks/useAppSelector';
import { Event } from '../../types';

const getEventIcon = (type: string) => {
  switch (type) {
    case 'security':
      return <Security />;
    case 'access':
      return <DoorFront />;
    case 'maintenance':
      return <Build />;
    case 'emergency':
      return <ErrorIcon />;
    default:
      return <Circle />;
  }
};

const getEventColor = (severity: string): 'error' | 'warning' | 'success' | 'info' => {
  switch (severity) {
    case 'high':
      return 'error';
    case 'medium':
      return 'warning';
    case 'low':
      return 'success';
    default:
      return 'info';
  }
};

export const AnimatedTimeline: React.FC = () => {
  const { events } = useAppSelector((state) => state.events);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Take only the latest 10 events for the timeline
  const recentEvents = events.slice(0, 10);

  useEffect(() => {
    // Auto-scroll to top when new events arrive
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [events.length]);

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ pb: 0 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" fontWeight="bold">
            Timeline de Eventos
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              label={`${events.filter(e => e.status === 'pending').length} activos`}
              color="warning"
              size="small"
            />
            <IconButton size="small">
              <Refresh />
            </IconButton>
          </Stack>
        </Stack>
      </CardContent>

      <Box
        ref={containerRef}
        sx={{
          flex: 1,
          overflow: 'auto',
          px: 2,
          pb: 2,
          scrollBehavior: 'smooth',
        }}
      >
        <Timeline position="alternate">
          <AnimatePresence>
            {recentEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.1,
                  type: 'spring',
                  stiffness: 100,
                }}
              >
                <TimelineItem>
                  <TimelineOppositeContent
                    sx={{ m: 'auto 0' }}
                    align={index % 2 === 0 ? 'right' : 'left'}
                    variant="body2"
                    color="text.secondary"
                  >
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                    >
                      {format(new Date(event.timestamp), 'HH:mm', { locale: es })}
                      <Typography variant="caption" display="block">
                        {format(new Date(event.timestamp), 'dd MMM', { locale: es })}
                      </Typography>
                    </motion.div>
                  </TimelineOppositeContent>
                  
                  <TimelineSeparator>
                    <TimelineConnector sx={{ bgcolor: 'divider' }} />
                    <motion.div
                      whileHover={{ scale: 1.2 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      <TimelineDot
                        color={getEventColor(event.severity)}
                        variant={index === 0 ? 'filled' : 'outlined'}
                        sx={{
                          boxShadow: index === 0 ? '0 0 10px rgba(255, 107, 53, 0.5)' : 'none',
                        }}
                      >
                        {getEventIcon(event.type)}
                      </TimelineDot>
                    </motion.div>
                    <TimelineConnector sx={{ bgcolor: 'divider' }} />
                  </TimelineSeparator>
                  
                  <TimelineContent sx={{ py: '12px', px: 2 }}>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          backgroundColor: 'background.paper',
                          border: '1px solid',
                          borderColor: 'divider',
                          boxShadow: 1,
                          '&:hover': {
                            boxShadow: 3,
                            borderColor: 'primary.main',
                          },
                          transition: 'all 0.3s ease',
                        }}
                      >
                        <Stack spacing={1}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="subtitle2" fontWeight="bold">
                              {event.title}
                            </Typography>
                            {event.status === 'resolved' && (
                              <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
                            )}
                          </Stack>
                          
                          <Typography variant="body2" color="text.secondary">
                            {event.description}
                          </Typography>
                          
                          <Stack direction="row" spacing={1}>
                            <Chip
                              label={event.type}
                              size="small"
                              variant="outlined"
                            />
                            {event.Building && (
                              <Chip
                                label={event.Building.name}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            )}
                          </Stack>
                        </Stack>
                      </Box>
                    </motion.div>
                  </TimelineContent>
                </TimelineItem>
              </motion.div>
            ))}
          </AnimatePresence>
        </Timeline>

        {recentEvents.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              No hay eventos recientes
            </Typography>
          </Box>
        )}
      </Box>
    </Card>
  );
};