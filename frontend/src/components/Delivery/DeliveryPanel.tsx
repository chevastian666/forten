import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Stack,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tab,
  Tabs,
  Badge,
  Tooltip,
  Paper,
  Divider,
} from '@mui/material';
import {
  LocalShipping,
  QrCodeScanner,
  Notifications,
  CameraAlt,
  CheckCircle,
  Schedule,
  LocationOn,
  Person,
  Refresh,
  NotificationsActive,
  Lock,
  LockOpen,
  Inventory,
  PhotoCamera,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import NotificationService from '../../services/notificationService';

interface DeliveryItem {
  id: string;
  trackingNumber: string;
  apartment: string;
  recipient: string;
  company: string;
  status: 'en_camino' | 'en_edificio' | 'en_casillero' | 'entregado' | 'retirado';
  estimatedTime?: string;
  actualTime?: string;
  lockerId?: string;
  photo?: string;
  qrCode?: string;
  priority: 'normal' | 'express' | 'urgent';
}

interface LockerBox {
  id: string;
  size: 'small' | 'medium' | 'large';
  status: 'available' | 'occupied' | 'maintenance';
  deliveryId?: string;
  apartment?: string;
}

const initialDeliveries: DeliveryItem[] = [
  {
    id: '1',
    trackingNumber: 'ML789456123',
    apartment: '4A',
    recipient: 'María García',
    company: 'MercadoLibre',
    status: 'en_camino',
    estimatedTime: '14:30',
    priority: 'normal',
  },
  {
    id: '2',
    trackingNumber: 'UBR987654321',
    apartment: '7B',
    recipient: 'Juan Pérez',
    company: 'Uber Eats',
    status: 'en_edificio',
    priority: 'express',
    photo: 'https://i.pravatar.cc/150?img=20',
  },
  {
    id: '3',
    trackingNumber: 'AMZ456789012',
    apartment: '2C',
    recipient: 'Ana Martínez',
    company: 'Amazon',
    status: 'en_casillero',
    lockerId: 'L-A3',
    qrCode: 'QR789456',
    priority: 'urgent',
  },
];

const initialLockers: LockerBox[] = [
  { id: 'L-A1', size: 'small', status: 'available' },
  { id: 'L-A2', size: 'medium', status: 'available' },
  { id: 'L-A3', size: 'large', status: 'occupied', deliveryId: '3', apartment: '2C' },
  { id: 'L-B1', size: 'small', status: 'occupied', deliveryId: '4', apartment: '5D' },
  { id: 'L-B2', size: 'medium', status: 'maintenance' },
  { id: 'L-B3', size: 'large', status: 'available' },
  { id: 'L-C1', size: 'small', status: 'available' },
  { id: 'L-C2', size: 'medium', status: 'available' },
];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
};

export const DeliveryPanel: React.FC = () => {
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>(initialDeliveries);
  const [lockers, setLockers] = useState<LockerBox[]>(initialLockers);
  const [tabValue, setTabValue] = useState(0);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryItem | null>(null);
  const [notificationDialog, setNotificationDialog] = useState(false);

  useEffect(() => {
    // Listen for delivery updates from presentation mode
    const handleDeliveryUpdate = (event: CustomEvent) => {
      const newDelivery = event.detail;
      setDeliveries(prev => {
        // Check if delivery already exists
        const exists = prev.find(d => d.trackingNumber === newDelivery.trackingNumber);
        if (exists) {
          // Update existing delivery
          return prev.map(d => 
            d.trackingNumber === newDelivery.trackingNumber 
              ? { ...d, ...newDelivery }
              : d
          );
        } else {
          // Add new delivery
          return [newDelivery, ...prev.slice(0, 9)]; // Keep only last 10
        }
      });
    };

    // Simulate real-time delivery updates
    const interval = setInterval(() => {
      // Randomly update delivery status
      setDeliveries(prev => {
        const newDeliveries = [...prev];
        const randomIndex = Math.floor(Math.random() * newDeliveries.length);
        const delivery = newDeliveries[randomIndex];
        
        if (delivery && Math.random() > 0.7) {
          switch (delivery.status) {
            case 'en_camino':
              delivery.status = 'en_edificio';
              delivery.actualTime = format(new Date(), 'HH:mm');
              break;
            case 'en_edificio':
              delivery.status = 'en_casillero';
              delivery.lockerId = getAvailableLocker();
              delivery.qrCode = `QR${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
              break;
          }
        }
        
        return newDeliveries;
      });
    }, 8000);

    window.addEventListener('deliveryUpdate', handleDeliveryUpdate as EventListener);

    return () => {
      clearInterval(interval);
      window.removeEventListener('deliveryUpdate', handleDeliveryUpdate as EventListener);
    };
  }, []);

  const getAvailableLocker = (): string => {
    const available = lockers.find(l => l.status === 'available');
    return available ? available.id : 'L-X1';
  };

  const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'info' => {
    switch (status) {
      case 'en_camino': return 'info';
      case 'en_edificio': return 'warning';
      case 'en_casillero': return 'primary';
      case 'entregado': return 'success';
      case 'retirado': return 'success';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'en_camino': return 'En Camino';
      case 'en_edificio': return 'En Edificio';
      case 'en_casillero': return 'En Casillero';
      case 'entregado': return 'Entregado';
      case 'retirado': return 'Retirado';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'urgent': return '#F44336';
      case 'express': return '#FF9800';
      default: return '#4CAF50';
    }
  };

  const getCompanyLogo = (company: string): string => {
    switch (company.toLowerCase()) {
      case 'mercadolibre': return '💛';
      case 'amazon': return '📦';
      case 'uber eats': return '🍔';
      case 'rappi': return '🛵';
      default: return '📮';
    }
  };

  const handleOpenLocker = (delivery: DeliveryItem) => {
    setSelectedDelivery(delivery);
    setQrDialogOpen(true);
  };

  const handleGenerateQR = () => {
    if (selectedDelivery) {
      const qrCode = `QR${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      setDeliveries(prev => 
        prev.map(d => 
          d.id === selectedDelivery.id 
            ? { ...d, qrCode, status: 'en_casillero', lockerId: getAvailableLocker() }
            : d
        )
      );
      NotificationService.success(`Código QR generado: ${qrCode}`);
      setQrDialogOpen(false);
    }
  };

  const handleSendNotification = (delivery: DeliveryItem) => {
    NotificationService.aiAlert({
      type: 'person',
      title: `Paquete disponible para ${delivery.apartment}`,
      location: `Casillero ${delivery.lockerId}`,
      confidence: 0.95,
      severity: 'medium',
    });
    
    // Simulate WhatsApp notification
    window.dispatchEvent(new CustomEvent('whatsappMessage', {
      detail: {
        message: `📦 Su paquete de ${delivery.company} está disponible en casillero ${delivery.lockerId}. Código: ${delivery.qrCode}`,
        apartment: delivery.apartment,
        timestamp: new Date(),
      }
    }));
  };

  const getLockerColor = (status: string): string => {
    switch (status) {
      case 'available': return '#4CAF50';
      case 'occupied': return '#FF9800';
      case 'maintenance': return '#F44336';
      default: return '#757575';
    }
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ pb: 0 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <LocalShipping sx={{ color: '#FF6B35', fontSize: 32 }} />
            <Typography variant="h6" fontWeight="bold">
              Sistema de Delivery
            </Typography>
            <Badge badgeContent={deliveries.filter(d => d.status === 'en_edificio').length} color="error">
              <Chip label="En tiempo real" color="success" size="small" />
            </Badge>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              startIcon={<NotificationsActive />}
              onClick={() => setNotificationDialog(true)}
              variant="outlined"
            >
              Notificar
            </Button>
            <IconButton size="small">
              <Refresh />
            </IconButton>
          </Stack>
        </Stack>

        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label={`Deliveries (${deliveries.length})`} />
          <Tab label="Casilleros" />
          <Tab label="Tracking" />
        </Tabs>
      </CardContent>

      <Box sx={{ flex: 1, overflow: 'auto', px: 2, pb: 2 }}>
        <TabPanel value={tabValue} index={0}>
          <List sx={{ py: 0 }}>
            <AnimatePresence>
              {deliveries.map((delivery, index) => (
                <motion.div
                  key={delivery.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <ListItem
                    sx={{
                      px: 1,
                      py: 1,
                      mb: 1,
                      borderRadius: 2,
                      border: `1px solid ${getPriorityColor(delivery.priority)}20`,
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        sx={{
                          backgroundColor: getStatusColor(delivery.status) === 'success' ? '#4CAF50' : '#FF6B35',
                          fontSize: 20,
                        }}
                      >
                        {getCompanyLogo(delivery.company)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" fontWeight="medium">
                            {delivery.company} - {delivery.apartment}
                          </Typography>
                          <Chip
                            label={getStatusLabel(delivery.status)}
                            color={getStatusColor(delivery.status)}
                            size="small"
                          />
                          {delivery.priority !== 'normal' && (
                            <Chip
                              label={delivery.priority.toUpperCase()}
                              size="small"
                              sx={{
                                backgroundColor: getPriorityColor(delivery.priority),
                                color: 'white',
                                fontSize: '0.6rem',
                              }}
                            />
                          )}
                        </Stack>
                      }
                      secondary={
                        <Stack spacing={0.5}>
                          <Typography variant="caption">
                            {delivery.recipient} • {delivery.trackingNumber}
                          </Typography>
                          {delivery.lockerId && (
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="caption" color="primary">
                                Casillero: {delivery.lockerId}
                              </Typography>
                              {delivery.qrCode && (
                                <Chip
                                  label={delivery.qrCode}
                                  size="small"
                                  variant="outlined"
                                  sx={{ height: 20, fontSize: '0.6rem' }}
                                />
                              )}
                            </Stack>
                          )}
                        </Stack>
                      }
                    />
                    <Stack direction="row" spacing={1}>
                      {delivery.status === 'en_edificio' && (
                        <Tooltip title="Asignar a casillero">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenLocker(delivery)}
                            sx={{ color: '#FF6B35' }}
                          >
                            <QrCodeScanner />
                          </IconButton>
                        </Tooltip>
                      )}
                      {delivery.status === 'en_casillero' && (
                        <Tooltip title="Notificar residente">
                          <IconButton
                            size="small"
                            onClick={() => handleSendNotification(delivery)}
                            sx={{ color: '#4CAF50' }}
                          >
                            <NotificationsActive />
                          </IconButton>
                        </Tooltip>
                      )}
                      {delivery.photo && (
                        <Tooltip title="Ver foto">
                          <IconButton size="small" sx={{ color: '#2196F3' }}>
                            <PhotoCamera />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </ListItem>
                </motion.div>
              ))}
            </AnimatePresence>
          </List>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2 }}>
            {lockers.map((locker) => (
              <motion.div
                key={locker.id}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <Paper
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    border: `2px solid ${getLockerColor(locker.status)}`,
                    backgroundColor: `${getLockerColor(locker.status)}10`,
                    cursor: 'pointer',
                  }}
                >
                  <Stack spacing={1} alignItems="center">
                    {locker.status === 'occupied' ? <Lock /> : <LockOpen />}
                    <Typography variant="subtitle2" fontWeight="bold">
                      {locker.id}
                    </Typography>
                    <Chip
                      label={locker.status === 'occupied' ? 'Ocupado' : 
                            locker.status === 'maintenance' ? 'Mantenimiento' : 'Disponible'}
                      color={locker.status === 'occupied' ? 'warning' : 
                            locker.status === 'maintenance' ? 'error' : 'success'}
                      size="small"
                    />
                    <Typography variant="caption" color="text.secondary">
                      {locker.size.toUpperCase()}
                    </Typography>
                    {locker.apartment && (
                      <Typography variant="caption" color="primary">
                        Apto {locker.apartment}
                      </Typography>
                    )}
                  </Stack>
                </Paper>
              </motion.div>
            ))}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Tracking en Tiempo Real
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Monitoreo GPS de todos los deliveries activos
            </Typography>
            
            {/* Simulated map placeholder */}
            <Paper
              sx={{
                height: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'grey.100',
                backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/svg/2000\'%3E%3Cpath d=\'M0 0h20v20H0z\' fill=\'%23f5f5f5\'/%3E%3C/svg%3E")',
              }}
            >
              <Stack spacing={2} alignItems="center">
                <LocationOn sx={{ fontSize: 48, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  Mapa de tracking GPS
                </Typography>
                <Stack direction="row" spacing={2}>
                  <Chip icon={<LocalShipping />} label="2 en camino" color="info" size="small" />
                  <Chip icon={<Schedule />} label="1 retrasado" color="warning" size="small" />
                </Stack>
              </Stack>
            </Paper>
          </Box>
        </TabPanel>
      </Box>

      {/* QR Dialog */}
      <Dialog open={qrDialogOpen} onClose={() => setQrDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Asignar Casillero</DialogTitle>
        <DialogContent>
          {selectedDelivery && (
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6">{selectedDelivery.company}</Typography>
                <Typography color="text.secondary">
                  Para: {selectedDelivery.recipient} - {selectedDelivery.apartment}
                </Typography>
              </Box>
              
              <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: 'grey.50' }}>
                <QrCodeScanner sx={{ fontSize: 80, color: '#FF6B35', mb: 2 }} />
                <Typography variant="h4" fontWeight="bold" color="primary">
                  {selectedDelivery.qrCode || 'QR123456'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Código para casillero {getAvailableLocker()}
                </Typography>
              </Paper>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleGenerateQR} variant="contained">
            Generar QR y Asignar
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};