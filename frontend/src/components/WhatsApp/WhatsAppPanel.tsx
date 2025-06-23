import React, { useEffect, useState } from 'react';
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
  Button,
  TextField,
  IconButton,
  Chip,
  Stack,
  Paper,
  Divider,
} from '@mui/material';
import {
  WhatsApp,
  Send,
  Check,
  DoneAll,
  Refresh,
  NotificationsActive,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import NotificationService from '../../services/notificationService';

interface WhatsAppMessage {
  id: string;
  apartment: string;
  message: string;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
  type: 'sent' | 'received';
}

export const WhatsAppPanel: React.FC = () => {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedApartment, setSelectedApartment] = useState('');

  useEffect(() => {
    // Initialize with some mock messages
    const initialMessages: WhatsAppMessage[] = [
      {
        id: '1',
        apartment: '4A',
        message: 'Buenos días, el ascensor está en mantenimiento hasta las 14:00',
        timestamp: new Date(Date.now() - 3600000),
        status: 'read',
        type: 'sent',
      },
      {
        id: '2',
        apartment: '7B',
        message: 'Gracias por avisar!',
        timestamp: new Date(Date.now() - 3000000),
        status: 'read',
        type: 'received',
      },
      {
        id: '3',
        apartment: '10D',
        message: 'Hay un paquete en recepción para usted',
        timestamp: new Date(Date.now() - 1800000),
        status: 'delivered',
        type: 'sent',
      },
    ];
    setMessages(initialMessages);

    // Listen for WhatsApp events from presentation mode
    const handleWhatsAppMessage = (event: CustomEvent) => {
      const { message, apartment, timestamp } = event.detail;
      const newMsg: WhatsAppMessage = {
        id: `msg-${Date.now()}`,
        apartment,
        message,
        timestamp,
        status: 'delivered',
        type: 'received',
      };
      setMessages(prev => [newMsg, ...prev]);
    };

    window.addEventListener('whatsappMessage', handleWhatsAppMessage as EventListener);

    return () => {
      window.removeEventListener('whatsappMessage', handleWhatsAppMessage as EventListener);
    };
  }, []);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedApartment) return;

    const message: WhatsAppMessage = {
      id: `msg-${Date.now()}`,
      apartment: selectedApartment,
      message: newMessage,
      timestamp: new Date(),
      status: 'sent',
      type: 'sent',
    };

    setMessages(prev => [message, ...prev]);
    NotificationService.success(`Mensaje enviado a Apto ${selectedApartment}`);
    
    // Simulate delivery after 1 second
    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === message.id ? { ...msg, status: 'delivered' } : msg
        )
      );
    }, 1000);

    // Simulate read after 3 seconds
    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === message.id ? { ...msg, status: 'read' } : msg
        )
      );
    }, 3000);

    setNewMessage('');
  };

  const sendBroadcast = () => {
    const broadcastMessage = 'AVISO: Corte de agua programado mañana de 9:00 a 12:00 hrs.';
    const apartments = ['1A', '2B', '3C', '4D', '5E', '6F', '7G', '8H'];
    
    apartments.forEach((apt, index) => {
      setTimeout(() => {
        const message: WhatsAppMessage = {
          id: `broadcast-${Date.now()}-${apt}`,
          apartment: apt,
          message: broadcastMessage,
          timestamp: new Date(),
          status: 'sent',
          type: 'sent',
        };
        setMessages(prev => [message, ...prev]);
      }, index * 200);
    });

    NotificationService.info('📢 Difusión enviada a todos los apartamentos');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Check sx={{ fontSize: 14, color: 'text.secondary' }} />;
      case 'delivered':
        return <DoneAll sx={{ fontSize: 14, color: 'text.secondary' }} />;
      case 'read':
        return <DoneAll sx={{ fontSize: 14, color: '#00BFA5' }} />;
      default:
        return null;
    }
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ pb: 0 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <WhatsApp sx={{ color: '#25D366', fontSize: 32 }} />
            <Typography variant="h6" fontWeight="bold">
              WhatsApp Edificio
            </Typography>
            <Chip
              label={`${messages.filter(m => m.type === 'received' && m.status !== 'read').length} nuevos`}
              color="primary"
              size="small"
            />
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              startIcon={<NotificationsActive />}
              onClick={sendBroadcast}
              variant="outlined"
            >
              Difusión
            </Button>
            <IconButton size="small">
              <Refresh />
            </IconButton>
          </Stack>
        </Stack>

        {/* Send message section */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={2}>
              <TextField
                size="small"
                placeholder="Apto (ej: 4A)"
                value={selectedApartment}
                onChange={(e) => setSelectedApartment(e.target.value.toUpperCase())}
                sx={{ width: 100 }}
              />
              <TextField
                size="small"
                fullWidth
                placeholder="Escribir mensaje..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <Button
                variant="contained"
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || !selectedApartment}
                endIcon={<Send />}
              >
                Enviar
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </CardContent>

      <Divider />

      {/* Messages list */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 2, py: 1 }}>
        <List sx={{ py: 0 }}>
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <ListItem
                  sx={{
                    px: 1,
                    py: 0.5,
                    '&:hover': {
                      backgroundColor: 'action.hover',
                      borderRadius: 1,
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        backgroundColor: message.type === 'sent' ? 'primary.main' : 'success.main',
                        fontSize: 14,
                      }}
                    >
                      {message.apartment}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" fontWeight="medium">
                          Apto {message.apartment}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format(message.timestamp, 'HH:mm', { locale: es })}
                        </Typography>
                        {message.type === 'sent' && getStatusIcon(message.status)}
                      </Stack>
                    }
                    secondary={
                      <Typography
                        variant="body2"
                        sx={{
                          color: message.type === 'received' ? 'text.primary' : 'text.secondary',
                          fontWeight: message.type === 'received' ? 'medium' : 'normal',
                        }}
                      >
                        {message.message}
                      </Typography>
                    }
                  />
                </ListItem>
              </motion.div>
            ))}
          </AnimatePresence>
        </List>
      </Box>
    </Card>
  );
};