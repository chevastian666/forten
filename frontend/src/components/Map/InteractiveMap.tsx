import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  Button,
  IconButton,
} from '@mui/material';
import {
  Business,
  Warning,
  CheckCircle,
  Error as ErrorIcon,
  Refresh,
  ZoomIn,
  ZoomOut,
  MyLocation,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAppSelector } from '../../hooks/useAppSelector';
import { Building } from '../../types';

// Fix Leaflet icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetina,
  iconUrl: icon,
  shadowUrl: iconShadow,
});

// Custom icon for buildings
const createBuildingIcon = (status: string) => {
  const color = status === 'active' ? '#4CAF50' : 
                status === 'inactive' ? '#F44336' : '#FF9800';
  
  return L.divIcon({
    className: 'custom-building-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        position: relative;
      ">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
          <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/>
        </svg>
        ${status === 'active' ? `
          <div style="
            position: absolute;
            top: -4px;
            right: -4px;
            width: 12px;
            height: 12px;
            background-color: #4CAF50;
            border-radius: 50%;
            border: 2px solid white;
            animation: pulse 2s infinite;
          "></div>
        ` : ''}
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
};

// Mock building locations for demo
const mockBuildingLocations: Record<string, [number, number]> = {
  'building-1': [-34.905, -56.185], // Montevideo
  'building-2': [-34.910, -56.175],
  'building-3': [-34.895, -56.190],
  'building-4': [-34.915, -56.180],
  'building-5': [-34.900, -56.170],
};

// Map controls component
const MapControls: React.FC = () => {
  const map = useMap();

  const handleZoomIn = () => map.zoomIn();
  const handleZoomOut = () => map.zoomOut();
  const handleCenter = () => map.setView([-34.905, -56.185], 13);

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      <IconButton
        size="small"
        onClick={handleZoomIn}
        sx={{
          backgroundColor: 'background.paper',
          boxShadow: 2,
          '&:hover': { backgroundColor: 'background.paper' },
        }}
      >
        <ZoomIn />
      </IconButton>
      <IconButton
        size="small"
        onClick={handleZoomOut}
        sx={{
          backgroundColor: 'background.paper',
          boxShadow: 2,
          '&:hover': { backgroundColor: 'background.paper' },
        }}
      >
        <ZoomOut />
      </IconButton>
      <IconButton
        size="small"
        onClick={handleCenter}
        sx={{
          backgroundColor: 'background.paper',
          boxShadow: 2,
          '&:hover': { backgroundColor: 'background.paper' },
        }}
      >
        <MyLocation />
      </IconButton>
    </Box>
  );
};

export const InteractiveMap: React.FC = () => {
  const { buildings } = useAppSelector((state) => state.buildings);
  const { events } = useAppSelector((state) => state.events);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);

  // Count events per building
  const eventCounts = events.reduce((acc, event) => {
    if (event.status === 'pending') {
      acc[event.buildingId] = (acc[event.buildingId] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Add CSS for pulsing animation
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% {
          box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
        }
        70% {
          box-shadow: 0 0 0 10px rgba(76, 175, 80, 0);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <Card sx={{ height: '100%', position: 'relative' }}>
      <CardContent sx={{ p: 0, height: '100%', '&:last-child': { pb: 0 } }}>
        <Box sx={{ position: 'absolute', top: 16, left: 16, zIndex: 1000 }}>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card sx={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
              <CardContent sx={{ py: 1 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Mapa de Edificios
                </Typography>
                <Stack direction="row" spacing={2}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
                    <Typography variant="caption">
                      {buildings.filter(b => b.status === 'active').length} Activos
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Warning sx={{ fontSize: 16, color: 'warning.main' }} />
                    <Typography variant="caption">
                      {Object.keys(eventCounts).length} Con alertas
                    </Typography>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </motion.div>
        </Box>

        <MapContainer
          center={[-34.905, -56.185]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapControls />

          {buildings.map((building, index) => {
            const location = mockBuildingLocations[building.id] || 
              [-34.905 + (Math.random() - 0.5) * 0.02, -56.185 + (Math.random() - 0.5) * 0.02];
            
            return (
              <Marker
                key={building.id}
                position={location as [number, number]}
                icon={createBuildingIcon(building.status)}
                eventHandlers={{
                  click: () => setSelectedBuilding(building),
                }}
              >
                <Popup>
                  <Box sx={{ minWidth: 250 }}>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {building.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {building.address}
                        </Typography>
                      </Box>
                      
                      <Stack direction="row" spacing={1}>
                        <Chip
                          label={building.status === 'active' ? 'Activo' : 'Inactivo'}
                          size="small"
                          color={building.status === 'active' ? 'success' : 'default'}
                        />
                        {eventCounts[building.id] && (
                          <Chip
                            label={`${eventCounts[building.id]} alertas`}
                            size="small"
                            color="warning"
                            icon={<Warning />}
                          />
                        )}
                      </Stack>
                      
                      <Stack spacing={1}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption">Unidades:</Typography>
                          <Typography variant="caption" fontWeight="bold">
                            {building.totalUnits}
                          </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption">Cámaras:</Typography>
                          <Typography variant="caption" fontWeight="bold">
                            {building.totalCameras}
                          </Typography>
                        </Stack>
                      </Stack>
                      
                      <Button
                        variant="contained"
                        size="small"
                        fullWidth
                        onClick={() => window.location.href = `/buildings/${building.id}`}
                      >
                        Ver Detalles
                      </Button>
                    </Stack>
                  </Box>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </CardContent>
    </Card>
  );
};