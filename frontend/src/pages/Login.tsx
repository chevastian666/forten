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
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { login } from '../store/authSlice';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error } = useAppSelector((state) => state.auth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dispatch(login({ email, password })).unwrap();
      navigate('/');
    } catch (error) {
      // Error is handled by the slice
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8F9FA',
        background: 'linear-gradient(135deg, #F8F9FA 0%, #E9ECEF 100%)',
      }}
    >
      <Card
        sx={{
          width: '100%',
          maxWidth: 400,
          mx: 2,
          backgroundColor: '#FFFFFF',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          border: '1px solid #E0E0E0',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* Logo and Title */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 64,
                height: 64,
                borderRadius: 2,
                backgroundColor: '#FF6B35',
                mb: 2,
              }}
            >
              <Security sx={{ fontSize: 32, color: '#FFFFFF' }} />
            </Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 600,
                color: '#2C2C2C',
                mb: 1,
              }}
            >
              FORTEN
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: '#666666',
                fontWeight: 500,
              }}
            >
              Sistema de Gestión de Seguridad
            </Typography>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Login Form */}
          <Box component="form" onSubmit={handleSubmit}>
            {error && (
              <Alert 
                severity="error" 
                sx={{ mb: 3 }}
              >
                {error}
              </Alert>
            )}

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
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Demo Credentials */}
          <Box>
            <Typography 
              variant="body2" 
              sx={{ 
                color: '#666666', 
                mb: 2, 
                textAlign: 'center',
                fontWeight: 500,
              }}
            >
              Credenciales de demostración:
            </Typography>
            <Stack spacing={1.5}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 1,
                  backgroundColor: '#F8F9FA',
                  border: '1px solid #E0E0E0',
                }}
              >
                <Typography variant="subtitle2" sx={{ color: '#FF6B35', fontWeight: 600, mb: 0.5 }}>
                  Administrador
                </Typography>
                <Typography variant="body2" sx={{ color: '#666666', fontSize: '0.875rem' }}>
                  admin@forten.com / admin123
                </Typography>
              </Box>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 1,
                  backgroundColor: '#F8F9FA',
                  border: '1px solid #E0E0E0',
                }}
              >
                <Typography variant="subtitle2" sx={{ color: '#FF6B35', fontWeight: 600, mb: 0.5 }}>
                  Gerente
                </Typography>
                <Typography variant="body2" sx={{ color: '#666666', fontSize: '0.875rem' }}>
                  manager@forten.com / manager123
                </Typography>
              </Box>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 1,
                  backgroundColor: '#F8F9FA',
                  border: '1px solid #E0E0E0',
                }}
              >
                <Typography variant="subtitle2" sx={{ color: '#FF6B35', fontWeight: 600, mb: 0.5 }}>
                  Operador
                </Typography>
                <Typography variant="body2" sx={{ color: '#666666', fontSize: '0.875rem' }}>
                  operator@forten.com / operator123
                </Typography>
              </Box>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};