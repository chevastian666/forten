"use client";

import styled from '@emotion/styled';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { theme } from '@/lib/theme';
import { Badge } from './Badge';
import { Tooltip } from './Tooltip';
import {
  MapPinIcon,
  VideoCameraIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowsPointingOutIcon
} from '@heroicons/react/24/outline';

const Container = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  background: ${theme.colors.gray[50]};
  border-radius: ${theme.borderRadius.xl};
  overflow: hidden;
  box-shadow: ${theme.shadows.base};

  @media (prefers-color-scheme: dark) {
    background: ${theme.colors.gray[900]};
  }
`;

const MapContainer = styled.div<{ scale: number }>`
  position: relative;
  width: 100%;
  height: 100%;
  cursor: grab;
  overflow: hidden;
  transform: scale(${props => props.scale});
  transform-origin: center;
  transition: transform ${theme.transitions.base};

  &:active {
    cursor: grabbing;
  }
`;

const MapImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
`;

const MarkerContainer = styled(motion.div)<{ x: number; y: number }>`
  position: absolute;
  left: ${props => props.x}%;
  top: ${props => props.y}%;
  transform: translate(-50%, -50%);
  z-index: 10;
`;

const Marker = styled(motion.div)<{ type: string; status?: string }>`
  width: 32px;
  height: 32px;
  border-radius: ${theme.borderRadius.full};
  background: ${props => {
    if (props.status === 'alert') return theme.colors.error[500];
    switch (props.type) {
      case 'camera': return theme.colors.primary[500];
      case 'access': return theme.colors.success[500];
      case 'sensor': return theme.colors.warning[500];
      default: return theme.colors.gray[500];
    }
  }};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: ${theme.shadows.md};
  transition: all ${theme.transitions.fast};

  &:hover {
    transform: scale(1.2);
    box-shadow: ${theme.shadows.lg};
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const InfoPanel = styled(motion.div)`
  position: absolute;
  background: white;
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.md};
  box-shadow: ${theme.shadows.lg};
  min-width: 250px;
  z-index: 20;

  @media (prefers-color-scheme: dark) {
    background: ${theme.colors.gray[800]};
  }
`;

const InfoTitle = styled.h4`
  font-size: ${theme.typography.fontSize.base};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.gray[900]};
  margin: 0 0 ${theme.spacing.xs} 0;

  @media (prefers-color-scheme: dark) {
    color: ${theme.colors.gray[100]};
  }
`;

const InfoContent = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.gray[600]};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};

  @media (prefers-color-scheme: dark) {
    color: ${theme.colors.gray[400]};
  }
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Controls = styled.div`
  position: absolute;
  bottom: ${theme.spacing.md};
  right: ${theme.spacing.md};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
  z-index: 30;
`;

const ControlButton = styled(motion.button)`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: 1px solid ${theme.colors.gray[300]};
  border-radius: ${theme.borderRadius.full};
  color: ${theme.colors.gray[700]};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  box-shadow: ${theme.shadows.sm};

  &:hover {
    background: ${theme.colors.gray[50]};
    box-shadow: ${theme.shadows.md};
  }

  svg {
    width: 20px;
    height: 20px;
  }

  @media (prefers-color-scheme: dark) {
    background: ${theme.colors.gray[800]};
    border-color: ${theme.colors.gray[700]};
    color: ${theme.colors.gray[300]};

    &:hover {
      background: ${theme.colors.gray[700]};
    }
  }
`;

const Legend = styled.div`
  position: absolute;
  top: ${theme.spacing.md};
  left: ${theme.spacing.md};
  background: white;
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.sm};
  box-shadow: ${theme.shadows.md};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
  z-index: 30;

  @media (prefers-color-scheme: dark) {
    background: ${theme.colors.gray[800]};
  }
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-size: ${theme.typography.fontSize.xs};
  color: ${theme.colors.gray[600]};

  @media (prefers-color-scheme: dark) {
    color: ${theme.colors.gray[400]};
  }
`;

const LegendIcon = styled.div<{ color: string }>`
  width: 16px;
  height: 16px;
  border-radius: ${theme.borderRadius.full};
  background: ${props => props.color};
`;

const FloorSelector = styled.div`
  position: absolute;
  top: ${theme.spacing.md};
  right: ${theme.spacing.md};
  background: white;
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.xs};
  box-shadow: ${theme.shadows.md};
  display: flex;
  gap: ${theme.spacing.xs};
  z-index: 30;

  @media (prefers-color-scheme: dark) {
    background: ${theme.colors.gray[800]};
  }
`;

const FloorButton = styled.button<{ active: boolean }>`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border: 1px solid ${props => 
    props.active ? theme.colors.primary[500] : theme.colors.gray[300]
  };
  background: ${props => 
    props.active ? theme.colors.primary[500] : 'white'
  };
  color: ${props => 
    props.active ? 'white' : theme.colors.gray[700]
  };
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:hover {
    background: ${props => 
      props.active ? theme.colors.primary[600] : theme.colors.gray[50]
    };
  }

  @media (prefers-color-scheme: dark) {
    background: ${props => 
      props.active ? theme.colors.primary[600] : theme.colors.gray[700]
    };
    border-color: ${props => 
      props.active ? theme.colors.primary[500] : theme.colors.gray[600]
    };
    color: ${props => 
      props.active ? 'white' : theme.colors.gray[300]
    };
  }
`;

export interface MapMarker {
  id: string;
  type: 'camera' | 'access' | 'sensor' | 'alert';
  name: string;
  x: number; // percentage
  y: number; // percentage
  floor?: number;
  status?: 'active' | 'inactive' | 'alert';
  data?: any;
}

export interface BuildingMapProps {
  floorPlans: {
    floor: number;
    imageUrl: string;
    name: string;
  }[];
  markers: MapMarker[];
  initialFloor?: number;
  onMarkerClick?: (marker: MapMarker) => void;
  showLegend?: boolean;
  showFloorSelector?: boolean;
  maxZoom?: number;
  minZoom?: number;
}

const iconMap = {
  camera: VideoCameraIcon,
  access: MapPinIcon,
  sensor: UserGroupIcon,
  alert: ExclamationTriangleIcon
};

export function BuildingMap({
  floorPlans,
  markers,
  initialFloor = 1,
  onMarkerClick,
  showLegend = true,
  showFloorSelector = true,
  maxZoom = 3,
  minZoom = 0.5
}: BuildingMapProps) {
  const [currentFloor, setCurrentFloor] = useState(initialFloor);
  const [scale, setScale] = useState(1);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [panelPosition, setPanelPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const currentFloorPlan = floorPlans.find(fp => fp.floor === currentFloor);
  const currentMarkers = markers.filter(m => !m.floor || m.floor === currentFloor);

  const handleMarkerClick = (marker: MapMarker, event: React.MouseEvent) => {
    setSelectedMarker(marker);
    
    // Calculate panel position
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const x = (marker.x / 100) * rect.width;
      const y = (marker.y / 100) * rect.height;
      
      // Adjust position to keep panel in view
      const panelX = x + 20 > rect.width - 250 ? x - 270 : x + 20;
      const panelY = y + 20 > rect.height - 150 ? y - 170 : y + 20;
      
      setPanelPosition({ x: panelX, y: panelY });
    }
    
    onMarkerClick?.(marker);
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, maxZoom));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, minZoom));
  };

  const handleFullscreen = () => {
    containerRef.current?.requestFullscreen?.();
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedMarker(null);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <Container ref={containerRef}>
      <MapContainer scale={scale}>
        {currentFloorPlan && (
          <MapImage 
            src={currentFloorPlan.imageUrl} 
            alt={`Planta ${currentFloorPlan.name}`}
            draggable={false}
          />
        )}

        {currentMarkers.map(marker => {
          const Icon = iconMap[marker.type];
          
          return (
            <MarkerContainer
              key={marker.id}
              x={marker.x}
              y={marker.y}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Tooltip content={marker.name}>
                <Marker
                  type={marker.type}
                  status={marker.status}
                  onClick={(e) => handleMarkerClick(marker, e)}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Icon />
                </Marker>
              </Tooltip>
            </MarkerContainer>
          );
        })}
      </MapContainer>

      {showLegend && (
        <Legend>
          <LegendItem>
            <LegendIcon color={theme.colors.primary[500]} />
            <span>Cámaras</span>
          </LegendItem>
          <LegendItem>
            <LegendIcon color={theme.colors.success[500]} />
            <span>Puntos de acceso</span>
          </LegendItem>
          <LegendItem>
            <LegendIcon color={theme.colors.warning[500]} />
            <span>Sensores</span>
          </LegendItem>
          <LegendItem>
            <LegendIcon color={theme.colors.error[500]} />
            <span>Alertas</span>
          </LegendItem>
        </Legend>
      )}

      {showFloorSelector && floorPlans.length > 1 && (
        <FloorSelector>
          {floorPlans.map(floor => (
            <FloorButton
              key={floor.floor}
              active={currentFloor === floor.floor}
              onClick={() => setCurrentFloor(floor.floor)}
            >
              {floor.name}
            </FloorButton>
          ))}
        </FloorSelector>
      )}

      <Controls>
        <ControlButton
          onClick={handleZoomIn}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <MagnifyingGlassPlusIcon />
        </ControlButton>
        <ControlButton
          onClick={handleZoomOut}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <MagnifyingGlassMinusIcon />
        </ControlButton>
        <ControlButton
          onClick={handleFullscreen}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <ArrowsPointingOutIcon />
        </ControlButton>
      </Controls>

      <AnimatePresence>
        {selectedMarker && (
          <InfoPanel
            style={{ left: panelPosition.x, top: panelPosition.y }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <InfoTitle>{selectedMarker.name}</InfoTitle>
            <InfoContent>
              <InfoRow>
                <span>Tipo:</span>
                <Badge variant={selectedMarker.type === 'camera' ? 'primary' : 'secondary'} size="sm">
                  {selectedMarker.type}
                </Badge>
              </InfoRow>
              <InfoRow>
                <span>Estado:</span>
                <Badge 
                  variant={selectedMarker.status === 'active' ? 'success' : 'error'} 
                  size="sm"
                >
                  {selectedMarker.status || 'active'}
                </Badge>
              </InfoRow>
              {selectedMarker.data && (
                <>
                  {Object.entries(selectedMarker.data).map(([key, value]) => (
                    <InfoRow key={key}>
                      <span>{key}:</span>
                      <span>{String(value)}</span>
                    </InfoRow>
                  ))}
                </>
              )}
            </InfoContent>
          </InfoPanel>
        )}
      </AnimatePresence>
    </Container>
  );
}