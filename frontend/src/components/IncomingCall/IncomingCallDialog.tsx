import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  Avatar,
  IconButton,
  Stack,
  Chip,
  Paper,
} from '@mui/material';
import {
  Phone,
  PhoneDisabled,
  DoorFront,
  Videocam,
  Mic,
  MicOff,
  VolumeUp,
  Close,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationService from '../../services/notificationService';

interface IncomingCallData {
  visitorName: string;
  apartment: string;
  image: string;
  timestamp: Date;
}

export const IncomingCallDialog: React.FC = () => {
  const [callData, setCallData] = useState<IncomingCallData | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);

  useEffect(() => {
    const handleIncomingCall = (event: CustomEvent<IncomingCallData>) => {
      setCallData(event.detail);
      setIsOpen(true);
      setIsAnswered(false);
      setCallDuration(0);
      
      // Play ringtone sound (simulated)
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSMFL4NO89iNOAkaaLvt559NEAxQp+PwtmMcBjiR1/LMeSMFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSMFL4NO89iNOAkaaLvt559NEAxQp+PwtmMcBjiR1/LMeSMFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSMFL4NO89iNOAkaaLvt559N');
      audio.volume = 0.3;
      audio.loop = true;
      audio.play().catch(() => {});
      
      // Store audio reference to stop it later
      (window as any).__callAudio = audio;
    };

    window.addEventListener('incomingCall', handleIncomingCall as EventListener);

    return () => {
      window.removeEventListener('incomingCall', handleIncomingCall as EventListener);
      // Stop audio if exists
      if ((window as any).__callAudio) {
        (window as any).__callAudio.pause();
        delete (window as any).__callAudio;
      }
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAnswered && isOpen) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isAnswered, isOpen]);

  const handleAnswer = () => {
    setIsAnswered(true);
    // Stop ringtone
    if ((window as any).__callAudio) {
      (window as any).__callAudio.pause();
      delete (window as any).__callAudio;
    }
    NotificationService.success('Llamada conectada');
  };

  const handleDecline = () => {
    setIsOpen(false);
    // Stop ringtone
    if ((window as any).__callAudio) {
      (window as any).__callAudio.pause();
      delete (window as any).__callAudio;
    }
    NotificationService.info('Llamada rechazada');
  };

  const handleOpenDoor = () => {
    NotificationService.success('🚪 Puerta abierta remotamente');
    // Simulate door opening
    setTimeout(() => {
      setIsOpen(false);
    }, 2000);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!callData) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog
          open={isOpen}
          onClose={handleDecline}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            component: motion.div,
            initial: { scale: 0.8, opacity: 0 },
            animate: { scale: 1, opacity: 1 },
            exit: { scale: 0.8, opacity: 0 },
            transition: { duration: 0.3 },
            sx: {
              borderRadius: 3,
              overflow: 'hidden',
              background: 'linear-gradient(135deg, #1E2328 0%, #0F1419 100%)',
            },
          }}
        >
          <DialogContent sx={{ p: 0 }}>
            <Box
              sx={{
                position: 'relative',
                height: isAnswered ? 450 : 350,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Header with close button */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  zIndex: 1,
                }}
              >
                <IconButton
                  onClick={handleDecline}
                  sx={{
                    color: 'white',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    },
                  }}
                >
                  <Close />
                </IconButton>
              </Box>

              {/* Visitor info */}
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 4,
                }}
              >
                <motion.div
                  animate={!isAnswered ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Avatar
                    src={callData.image}
                    sx={{
                      width: 120,
                      height: 120,
                      mb: 3,
                      border: '4px solid',
                      borderColor: isAnswered ? '#4CAF50' : '#FF6B35',
                      boxShadow: isAnswered 
                        ? '0 0 20px rgba(76, 175, 80, 0.5)'
                        : '0 0 20px rgba(255, 107, 53, 0.5)',
                    }}
                  />
                </motion.div>

                <Typography variant="h5" color="white" fontWeight="bold" gutterBottom>
                  {callData.visitorName}
                </Typography>

                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                  <Chip
                    icon={<DoorFront />}
                    label={`Apartamento ${callData.apartment}`}
                    sx={{
                      backgroundColor: 'rgba(255, 107, 53, 0.2)',
                      color: '#FF6B35',
                      border: '1px solid #FF6B35',
                    }}
                  />
                  {isAnswered && (
                    <Chip
                      label={formatDuration(callDuration)}
                      color="success"
                      size="small"
                    />
                  )}
                </Stack>

                {!isAnswered && (
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Llamada entrante...
                    </Typography>
                  </motion.div>
                )}
              </Box>

              {/* Action buttons */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                {!isAnswered ? (
                  <Stack direction="row" spacing={2} justifyContent="center">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="contained"
                        color="error"
                        size="large"
                        startIcon={<PhoneDisabled />}
                        onClick={handleDecline}
                        sx={{
                          borderRadius: 50,
                          px: 4,
                          py: 1.5,
                          backgroundColor: '#F44336',
                          '&:hover': {
                            backgroundColor: '#D32F2F',
                          },
                        }}
                      >
                        Rechazar
                      </Button>
                    </motion.div>

                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="contained"
                        color="success"
                        size="large"
                        startIcon={<Phone />}
                        onClick={handleAnswer}
                        sx={{
                          borderRadius: 50,
                          px: 4,
                          py: 1.5,
                          backgroundColor: '#4CAF50',
                          '&:hover': {
                            backgroundColor: '#388E3C',
                          },
                        }}
                      >
                        Responder
                      </Button>
                    </motion.div>
                  </Stack>
                ) : (
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={2} justifyContent="center">
                      <IconButton
                        onClick={() => setIsMuted(!isMuted)}
                        sx={{
                          backgroundColor: isMuted ? '#F44336' : 'rgba(255, 255, 255, 0.1)',
                          color: 'white',
                          '&:hover': {
                            backgroundColor: isMuted ? '#D32F2F' : 'rgba(255, 255, 255, 0.2)',
                          },
                        }}
                      >
                        {isMuted ? <MicOff /> : <Mic />}
                      </IconButton>

                      <IconButton
                        sx={{
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          color: 'white',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                          },
                        }}
                      >
                        <VolumeUp />
                      </IconButton>

                      <IconButton
                        sx={{
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          color: 'white',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                          },
                        }}
                      >
                        <Videocam />
                      </IconButton>
                    </Stack>

                    <Stack direction="row" spacing={2} justifyContent="center">
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          variant="contained"
                          size="large"
                          startIcon={<DoorFront />}
                          onClick={handleOpenDoor}
                          sx={{
                            borderRadius: 2,
                            px: 4,
                            py: 1.5,
                            backgroundColor: '#FF6B35',
                            '&:hover': {
                              backgroundColor: '#E85D25',
                            },
                          }}
                        >
                          Abrir Puerta
                        </Button>
                      </motion.div>

                      <Button
                        variant="outlined"
                        color="error"
                        size="large"
                        onClick={handleDecline}
                        sx={{
                          borderRadius: 2,
                          px: 3,
                          py: 1.5,
                        }}
                      >
                        Colgar
                      </Button>
                    </Stack>
                  </Stack>
                )}
              </Paper>
            </Box>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
};