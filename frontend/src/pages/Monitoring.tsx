import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Paper,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Button,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Fullscreen,
  FullscreenExit,
  Videocam,
  VideocamOff,
  ZoomIn,
  ZoomOut,
  Refresh,
} from '@mui/icons-material';
import { useAppSelector } from '../hooks/useAppSelector';

const CameraView: React.FC<{
  cameraId: string;
  cameraName: string;
  buildingName: string;
}> = ({ cameraId, cameraName, buildingName }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isActive, setIsActive] = useState(true);

  return (
    <Card sx={{ height: isFullscreen ? '100%' : 'auto' }}>
      <Box
        sx={{
          position: 'relative',
          paddingTop: isFullscreen ? '100%' : '56.25%', // 16:9 aspect ratio
          backgroundColor: 'black',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
          }}
        >
          {isActive ? (
            <Box textAlign="center">
              <Videocam sx={{ fontSize: 48, mb: 2 }} />
              <Typography>Cámara {cameraName}</Typography>
              <Typography variant="caption">{buildingName}</Typography>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                [Placeholder - Integración HikCentral pendiente]
              </Typography>
            </Box>
          ) : (
            <Box textAlign="center">
              <VideocamOff sx={{ fontSize: 48, mb: 2 }} />
              <Typography>Cámara desconectada</Typography>
            </Box>
          )}
        </Box>
        
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            p: 1,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="body2" color="white">
            {cameraName}
          </Typography>
          <Box>
            <IconButton size="small" sx={{ color: 'white' }}>
              <ZoomIn />
            </IconButton>
            <IconButton size="small" sx={{ color: 'white' }}>
              <ZoomOut />
            </IconButton>
            <IconButton
              size="small"
              sx={{ color: 'white' }}
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
            </IconButton>
          </Box>
        </Box>
        
        <Chip
          label={isActive ? 'EN VIVO' : 'OFFLINE'}
          color={isActive ? 'error' : 'default'}
          size="small"
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
          }}
        />
      </Box>
    </Card>
  );
};

export const Monitoring: React.FC = () => {
  const { buildings } = useAppSelector((state) => state.buildings);
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'focus'>('grid');

  // Simulación de cámaras por edificio
  const cameras = selectedBuilding ? [
    { id: '1', name: 'Entrada Principal', buildingId: selectedBuilding },
    { id: '2', name: 'Lobby', buildingId: selectedBuilding },
    { id: '3', name: 'Estacionamiento', buildingId: selectedBuilding },
    { id: '4', name: 'Azotea', buildingId: selectedBuilding },
  ] : [];

  const activeBuilding = buildings.find(b => b.id === selectedBuilding);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Centro de Monitoreo
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 250 }}>
            <InputLabel>Edificio</InputLabel>
            <Select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              label="Edificio"
            >
              <MenuItem value="">Seleccionar edificio...</MenuItem>
              {buildings.filter(b => b.status === 'active').map((building) => (
                <MenuItem key={building.id} value={building.id}>
                  {building.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            disabled={!selectedBuilding}
          >
            Actualizar
          </Button>
        </Box>
      </Box>

      {selectedBuilding ? (
        <>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid size="grow">
                <Typography variant="h6">
                  {activeBuilding?.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {activeBuilding?.address} - {cameras.length} cámaras activas
                </Typography>
              </Grid>
              <Grid>
                <Chip
                  label="SISTEMA OPERATIVO"
                  color="success"
                  sx={{ fontWeight: 'bold' }}
                />
              </Grid>
            </Grid>
          </Paper>

          <Grid container spacing={2}>
            {cameras.map((camera) => (
              <Grid size={{ xs: 12, sm: 6, md: viewMode === 'grid' ? 6 : 12 }} key={camera.id}>
                <CameraView
                  cameraId={camera.id}
                  cameraName={camera.name}
                  buildingName={activeBuilding?.name || ''}
                />
              </Grid>
            ))}
          </Grid>
        </>
      ) : (
        <Paper sx={{ p: 8, textAlign: 'center' }}>
          <Videocam sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Seleccione un edificio para ver las cámaras
          </Typography>
        </Paper>
      )}
    </Box>
  );
};