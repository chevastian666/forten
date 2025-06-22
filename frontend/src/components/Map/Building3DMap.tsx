import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Card, CardContent, Chip, IconButton, Stack } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowBack, Refresh, Fullscreen } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer } from '@deck.gl/layers';
import { Map } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

// Building status types
type BuildingStatus = 'ok' | 'alert' | 'critical';

// Building data interface
interface Building3D {
  id: string;
  name: string;
  position: [number, number]; // [lng, lat]
  status: BuildingStatus;
  height: number;
  units: number;
  cameras: number;
  events: number;
  temperature: number;
  humidity: number;
  connectivity: number;
  lastUpdate: Date;
  address: string;
}

// Mock data for 20 buildings in Montevideo
const generateMockBuildings = (): Building3D[] => {
  const montevideoCenter = [-56.1645, -34.9011]; // Montevideo coordinates
  const buildings: Building3D[] = [];
  
  // Famous locations in Montevideo for realistic placement
  const locations = [
    { name: 'Torre Ejecutiva', pos: [-56.1917, -34.9058], addr: 'Liniers 1324' },
    { name: 'World Trade Center', pos: [-56.1526, -34.9067], addr: 'Luis Alberto de Herrera 1248' },
    { name: 'Torre de las Telecomunicaciones', pos: [-56.1847, -34.9011], addr: 'Guatemala 1075' },
    { name: 'Palacio Salvo', pos: [-56.1983, -34.9081], addr: 'Plaza Independencia 848' },
    { name: 'Torre Centenario', pos: [-56.1478, -34.9156], addr: 'Av. Brasil 2681' },
    { name: 'Centro de Comercio', pos: [-56.1745, -34.9014], addr: 'Zabala 1432' },
    { name: 'Edificio Ciudadela', pos: [-56.2089, -34.9067], addr: 'Ciudadela 1229' },
    { name: 'Torre del Entrevero', pos: [-56.1889, -34.9089], addr: 'Andes 1365' },
    { name: 'Complejo América', pos: [-56.1567, -34.9123], addr: 'Av. Italia 6201' },
    { name: 'Torre Libertador', pos: [-56.1634, -34.9034], addr: 'Plaza Cagancha 1335' },
    { name: 'Edificio Panamericano', pos: [-56.1712, -34.9045], addr: 'Convención 1343' },
    { name: 'Centro Empresarial', pos: [-56.1423, -34.9089], addr: 'Av. 26 de Marzo 3535' },
    { name: 'Torre Pocitos', pos: [-56.1389, -34.9156], addr: 'Av. Brasil 2890' },
    { name: 'Complejo Cordón', pos: [-56.1834, -34.9023], addr: '18 de Julio 1234' },
    { name: 'Edificio Punta Carretas', pos: [-56.1534, -34.9234], addr: 'Ellauri 505' },
    { name: 'Centro Logístico', pos: [-56.2156, -34.8934], addr: 'Camino Carrasco 6180' },
    { name: 'Torre Carrasco', pos: [-56.0456, -34.8734], addr: 'Rambla República de México 6125' },
    { name: 'Complejo Buceo', pos: [-56.1289, -34.9089], addr: 'Av. Rivera 3250' },
    { name: 'Edificio Malvín', pos: [-56.1123, -34.8934], addr: 'Av. Italia 4567' },
    { name: 'Centro Tres Cruces', pos: [-56.1667, -34.8945], addr: 'Bvar. Artigas 1825' }
  ];

  locations.forEach((location, index) => {
    const statusOptions: BuildingStatus[] = ['ok', 'alert', 'critical'];
    const status = statusOptions[Math.floor(Math.random() * statusOptions.length)];
    
    buildings.push({
      id: `building-${index + 1}`,
      name: location.name,
      position: location.pos as [number, number],
      status,
      height: 20 + Math.random() * 80, // 20-100 floors
      units: 50 + Math.floor(Math.random() * 200), // 50-250 units
      cameras: 8 + Math.floor(Math.random() * 24), // 8-32 cameras
      events: Math.floor(Math.random() * 15), // 0-15 events
      temperature: 18 + Math.random() * 12, // 18-30°C
      humidity: 40 + Math.random() * 40, // 40-80%
      connectivity: 85 + Math.random() * 15, // 85-100%
      lastUpdate: new Date(Date.now() - Math.random() * 3600000), // Last hour
      address: location.addr,
    });
  });

  return buildings;
};

// Status colors and configurations
const getStatusConfig = (status: BuildingStatus) => {
  switch (status) {
    case 'ok':
      return {
        color: [76, 175, 80, 200], // Green
        glowColor: '#4CAF50',
        pulseSpeed: 0,
        label: 'Normal',
      };
    case 'alert':
      return {
        color: [255, 193, 7, 200], // Yellow
        glowColor: '#FFC107',
        pulseSpeed: 2000,
        label: 'Alerta',
      };
    case 'critical':
      return {
        color: [244, 67, 54, 200], // Red
        glowColor: '#F44336',
        pulseSpeed: 1000,
        label: 'Crítico',
      };
  }
};

// Hover info component
const HoverInfo: React.FC<{
  object: Building3D | null;
  x: number;
  y: number;
}> = ({ object, x, y }) => {
  if (!object) return null;

  const config = getStatusConfig(object.status);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      style={{
        position: 'absolute',
        left: x + 10,
        top: y - 10,
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    >
      <Card
        sx={{
          minWidth: 300,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          border: `2px solid ${config.glowColor}`,
          borderRadius: 3,
          boxShadow: `0 8px 32px ${config.glowColor}50`,
        }}
      >
        <CardContent sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6" fontWeight="bold" color="primary">
                {object.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {object.address}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                label={config.label}
                size="small"
                sx={{
                  backgroundColor: config.glowColor,
                  color: 'white',
                  fontWeight: 'bold',
                }}
              />
              <Typography variant="caption" color="text.secondary">
                Actualizado: {object.lastUpdate.toLocaleTimeString()}
              </Typography>
            </Stack>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 2,
              }}
            >
              <Box>
                <Typography variant="body2" fontWeight="bold">
                  📏 {Math.floor(object.height)} pisos
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  🏠 {object.units} unidades
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  📹 {object.cameras} cámaras
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" fontWeight="bold">
                  ⚠️ {object.events} eventos
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  🌡️ {object.temperature.toFixed(1)}°C
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  📶 {object.connectivity.toFixed(0)}%
                </Typography>
              </Box>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export const Building3DMap: React.FC = () => {
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState<Building3D[]>(generateMockBuildings());
  const [hoveredObject, setHoveredObject] = useState<Building3D | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [viewState, setViewState] = useState({
    longitude: -56.1645,
    latitude: -34.9011,
    zoom: 11,
    pitch: 45,
    bearing: 0,
  });
  const [isRotating, setIsRotating] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Cinematic camera rotation
  useEffect(() => {
    if (!isRotating) return;

    const interval = setInterval(() => {
      setViewState(prev => ({
        ...prev,
        bearing: (prev.bearing + 0.5) % 360,
      }));
    }, 100);

    return () => clearInterval(interval);
  }, [isRotating]);

  // Real-time data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setBuildings(prev => prev.map(building => ({
        ...building,
        events: Math.max(0, building.events + Math.floor(Math.random() * 3 - 1)),
        temperature: Math.max(15, Math.min(35, building.temperature + (Math.random() - 0.5) * 2)),
        humidity: Math.max(30, Math.min(90, building.humidity + (Math.random() - 0.5) * 5)),
        connectivity: Math.max(70, Math.min(100, building.connectivity + (Math.random() - 0.5) * 5)),
        lastUpdate: new Date(),
      })));
      setLastUpdate(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Create 3D scatterplot layer with animated buildings
  const layers = useMemo(() => [
    new ScatterplotLayer({
      id: 'buildings-3d',
      data: buildings,
      pickable: true,
      opacity: 0.8,
      stroked: true,
      filled: true,
      radiusScale: 50,
      radiusMinPixels: 8,
      radiusMaxPixels: 40,
      lineWidthMinPixels: 2,
      getPosition: (d: Building3D) => [d.position[0], d.position[1], 0],
      getRadius: (d: Building3D) => Math.max(8, d.height / 3),
      getFillColor: (d: Building3D): [number, number, number, number] => {
        const config = getStatusConfig(d.status);
        const time = Date.now();
        
        // Pulsing effect for alerts
        if (config.pulseSpeed > 0) {
          const pulse = Math.sin(time / config.pulseSpeed) * 0.3 + 0.7;
          return config.color.map((c, i) => i === 3 ? c * pulse : c) as [number, number, number, number];
        }
        
        return config.color as [number, number, number, number];
      },
      getLineColor: (d: Building3D): [number, number, number, number] => {
        return [255, 255, 255, 150];
      },
      getLineWidth: 2,
      onHover: (info) => {
        if (info.object) {
          setHoveredObject(info.object as Building3D);
          setHoverPosition({ x: info.x, y: info.y });
        } else {
          setHoveredObject(null);
        }
      },
      updateTriggers: {
        getFillColor: Date.now(),
      },
    }),
  ], [buildings]);

  const handleRefresh = () => {
    setBuildings(generateMockBuildings());
    setLastUpdate(new Date());
  };

  const toggleRotation = () => {
    setIsRotating(!isRotating);
  };

  // Count buildings by status
  const statusCounts = useMemo(() => {
    const counts = { ok: 0, alert: 0, critical: 0 };
    buildings.forEach(building => counts[building.status]++);
    return counts;
  }, [buildings]);

  return (
    <Box
      sx={{
        position: 'relative',
        height: 'calc(100vh - 120px)', // Adjust for layout header and padding
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
        borderRadius: 2,
      }}
    >
      {/* Map Container */}
      <Box sx={{ width: '100%', height: '100%' }}>
        <DeckGL
          initialViewState={viewState}
          controller={true}
          layers={layers}
          onViewStateChange={({ viewState: newViewState }) => {
            if (!isRotating && 'longitude' in newViewState) {
              setViewState({
                longitude: newViewState.longitude,
                latitude: newViewState.latitude,
                zoom: newViewState.zoom,
                pitch: newViewState.pitch ?? 45,
                bearing: newViewState.bearing ?? 0,
              });
            }
          }}
        >
          <Map
            mapStyle="mapbox://styles/mapbox/dark-v10"
            mapboxAccessToken="pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw"
          />
        </DeckGL>
      </Box>

      {/* Header Overlay */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          p: 3,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%)',
          zIndex: 1000,
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: 'white',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
              }}
            >
              Mapa 3D de Edificios
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{ color: 'rgba(255,255,255,0.8)' }}
            >
              Monitoreo en Tiempo Real • {buildings.length} Edificios
            </Typography>
          </Box>

          <Stack direction="row" spacing={2}>
            <IconButton
              onClick={() => navigate('/')}
              sx={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                color: 'white',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' },
              }}
            >
              <ArrowBack />
            </IconButton>
            
            <IconButton
              onClick={toggleRotation}
              sx={{
                backgroundColor: isRotating ? 'rgba(255,107,53,0.2)' : 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                color: 'white',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' },
              }}
            >
              <Fullscreen />
            </IconButton>

            <IconButton
              onClick={handleRefresh}
              sx={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                color: 'white',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' },
              }}
            >
              <Refresh />
            </IconButton>
          </Stack>
        </Stack>
      </Box>

      {/* Status Legend */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          zIndex: 1000,
        }}
      >
        <Card
          sx={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 2,
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <Typography variant="h6" color="white" sx={{ mb: 2 }}>
              Estado de Edificios
            </Typography>
            <Stack spacing={1}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    backgroundColor: '#4CAF50',
                    boxShadow: '0 0 10px #4CAF50',
                  }}
                />
                <Typography color="white">
                  Normal ({statusCounts.ok})
                </Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    backgroundColor: '#FFC107',
                    boxShadow: '0 0 10px #FFC107',
                    animation: 'pulse 2s infinite',
                  }}
                />
                <Typography color="white">
                  Alerta ({statusCounts.alert})
                </Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    backgroundColor: '#F44336',
                    boxShadow: '0 0 10px #F44336',
                    animation: 'pulse 1s infinite',
                  }}
                />
                <Typography color="white">
                  Crítico ({statusCounts.critical})
                </Typography>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      {/* Info Panel */}
      <Box
        sx={{
          position: 'absolute',
          top: 100,
          right: 20,
          zIndex: 1000,
        }}
      >
        <Card
          sx={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 2,
            minWidth: 200,
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <Typography variant="body2" color="white" sx={{ mb: 1 }}>
              📍 Montevideo, Uruguay
            </Typography>
            <Typography variant="body2" color="white" sx={{ mb: 1 }}>
              🔄 Rotación: {isRotating ? 'Activa' : 'Pausada'}
            </Typography>
            <Typography variant="body2" color="white">
              ⏰ {lastUpdate.toLocaleTimeString()}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Hover Tooltip */}
      <AnimatePresence>
        {hoveredObject && (
          <HoverInfo
            object={hoveredObject}
            x={hoverPosition.x}
            y={hoverPosition.y}
          />
        )}
      </AnimatePresence>

      {/* CSS for pulse animation */}
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.1); }
            100% { opacity: 1; transform: scale(1); }
          }
        `}
      </style>
    </Box>
  );
};