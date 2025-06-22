import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Divider,
  Stack,
} from '@mui/material';
import { Security } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { login } from '../store/authSlice';
import NotificationService from '../services/notificationService';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error } = useAppSelector((state) => state.auth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      NotificationService.loading('Iniciando sesión...');
      const result = await dispatch(login({ email, password })).unwrap();
      NotificationService.dismiss();
      NotificationService.success(`¡Bienvenido, ${result.user.firstName}!`);
      navigate('/');
    } catch (error: any) {
      NotificationService.dismiss();
      NotificationService.error(error.message || 'Error al iniciar sesión');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0F1419',
          background: 'linear-gradient(135deg, #0F1419 0%, #1E2328 100%)',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ 
            duration: 0.6, 
            delay: 0.2,
            ease: [0.25, 0.46, 0.45, 0.94]
          }}
          style={{ width: '100%', maxWidth: 400, margin: '0 16px' }}
        >
          <Card
            sx={{
              width: '100%',
              backgroundColor: 'background.paper',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
              border: '1px solid rgba(154, 160, 166, 0.24)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <CardContent sx={{ p: 4 }}>
              {/* Logo and Title */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ 
                      duration: 0.8, 
                      delay: 0.6,
                      type: 'spring',
                      stiffness: 200,
                      damping: 20
                    }}
                  >
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 64,
                        height: 64,
                        borderRadius: 2,
                        backgroundColor: 'primary.main',
                        mb: 2,
                        boxShadow: '0 4px 16px rgba(255, 107, 53, 0.4)',
                      }}
                    >
                      <Security sx={{ fontSize: 32, color: '#FFFFFF' }} />
                    </Box>
                  </motion.div>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 700,
                      color: 'text.primary',
                      mb: 1,
                    }}
                  >
                    FORTEN
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
                      fontWeight: 500,
                    }}
                  >
                    Control Center Security System
                  </Typography>
                </Box>
              </motion.div>

              <Divider sx={{ mb: 3 }} />

              {/* Login Form */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <Box component="form" onSubmit={handleSubmit}>
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, y: -10 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Alert 
                          severity="error" 
                          sx={{ mb: 3 }}
                        >
                          {error}
                        </Alert>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.8 }}
                  >
                    <TextField
                      fullWidth
                      label="Correo electrónico"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      margin="normal"
                      required
                      variant="outlined"
                      sx={{ mb: 2 }}
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.9 }}
                  >
                    <TextField
                      fullWidth
                      label="Contraseña"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      margin="normal"
                      required
                      variant="outlined"
                      sx={{ mb: 3 }}
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 1.0 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      disabled={loading}
                      sx={{
                        py: 1.5,
                        fontSize: '1rem',
                        fontWeight: 500,
                        mb: 3,
                      }}
                    >
                      {loading ? (
                        <CircularProgress size={24} sx={{ color: '#FFFFFF' }} />
                      ) : (
                        'Iniciar Sesión'
                      )}
                    </Button>
                  </motion.div>
                </Box>
              </motion.div>

              <Divider sx={{ mb: 3 }} />

              {/* Demo Credentials */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1.1 }}
              >
                <Box>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: 'text.secondary', 
                      mb: 2, 
                      textAlign: 'center',
                      fontWeight: 500,
                    }}
                  >
                    Credenciales de demostración:
                  </Typography>
                  <Stack spacing={1.5}>
                    {[
                      { role: 'Administrador', email: 'admin@forten.com', password: 'admin123' },
                      { role: 'Gerente', email: 'manager@forten.com', password: 'manager123' },
                      { role: 'Operador', email: 'operator@forten.com', password: 'operator123' }
                    ].map((cred, index) => (
                      <motion.div
                        key={cred.role}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 1.2 + index * 0.1 }}
                        whileHover={{ 
                          scale: 1.02,
                          x: 4,
                          transition: { duration: 0.2 }
                        }}
                        onClick={() => {
                          setEmail(cred.email);
                          setPassword(cred.password);
                          NotificationService.info(`Credenciales de ${cred.role.toLowerCase()} cargadas`);
                        }}
                      >
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 1,
                            backgroundColor: 'rgba(255, 107, 53, 0.05)',
                            border: '1px solid rgba(154, 160, 166, 0.24)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              borderColor: 'primary.main',
                              backgroundColor: 'rgba(255, 107, 53, 0.08)',
                            },
                          }}
                        >
                          <Typography variant="subtitle2" sx={{ color: 'primary.main', fontWeight: 600, mb: 0.5 }}>
                            {cred.role}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                            {cred.email} / {cred.password}
                          </Typography>
                        </Box>
                      </motion.div>
                    ))}
                  </Stack>
                </Box>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </Box>
    </motion.div>
  );
};