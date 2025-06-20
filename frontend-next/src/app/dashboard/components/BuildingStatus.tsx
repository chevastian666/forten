"use client";

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import styled from '@emotion/styled';
import { theme } from '@/styles/theme';

const Container = styled.div`
  background: ${theme.colors.white};
  border-radius: ${theme.borderRadius.lg};
  box-shadow: ${theme.shadows.sm};
  border: 1px solid ${theme.colors.gray[200]};
  padding: ${theme.spacing.lg};

  .dark & {
    background: ${theme.colors.gray[800]};
    border-color: ${theme.colors.gray[700]};
  }
`;

const SystemItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing.md} 0;
  border-bottom: 1px solid ${theme.colors.gray[200]};
  
  &:last-child {
    border-bottom: none;
  }
  
  .dark & {
    border-color: ${theme.colors.gray[700]};
  }
`;

const SystemInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const SystemName = styled.div`
  font-weight: ${theme.typography.fontWeight.medium};
  color: ${theme.colors.gray[900]};
  
  .dark & {
    color: ${theme.colors.white};
  }
`;

const SystemDetails = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.gray[600]};
  
  .dark & {
    color: ${theme.colors.gray[400]};
  }
`;

const StatusIndicator = styled.div<{ status: 'online' | 'warning' | 'offline' }>`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    
    ${props => {
      switch (props.status) {
        case 'online':
          return `background: ${theme.colors.green[500]};`;
        case 'warning':
          return `background: ${theme.colors.yellow[500]};`;
        case 'offline':
          return `background: ${theme.colors.red[500]};`;
      }
    }}
  }
  
  .status-text {
    font-size: ${theme.typography.fontSize.sm};
    font-weight: ${theme.typography.fontWeight.medium};
    
    ${props => {
      switch (props.status) {
        case 'online':
          return `color: ${theme.colors.green[700]};`;
        case 'warning':
          return `color: ${theme.colors.yellow[700]};`;
        case 'offline':
          return `color: ${theme.colors.red[700]};`;
      }
    }}
  }
`;

const MaintenanceAlert = styled.div`
  background: ${theme.colors.blue[50]};
  border: 1px solid ${theme.colors.blue[200]};
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.md};
  margin-top: ${theme.spacing.md};
  
  .dark & {
    background: ${theme.colors.blue[900]};
    border-color: ${theme.colors.blue[700]};
  }
`;

const MaintenanceTitle = styled.h4`
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.medium};
  color: ${theme.colors.blue[800]};
  margin-bottom: ${theme.spacing.xs};
  
  .dark & {
    color: ${theme.colors.blue[200]};
  }
`;

const MaintenanceText = styled.p`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.blue[700]};
  margin: 0;
  
  .dark & {
    color: ${theme.colors.blue[300]};
  }
`;

interface SystemStatus {
  id: string;
  name: string;
  category: string;
  status: 'online' | 'warning' | 'offline';
  details: string;
  lastCheck: Date;
  icon: string;
}

interface MaintenanceSchedule {
  id: string;
  system: string;
  type: string;
  scheduledDate: Date;
  duration: string;
}

export function BuildingStatus() {
  const [systems, setSystems] = useState<SystemStatus[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBuildingStatus();
    const interval = setInterval(loadBuildingStatus, 120000); // Refresh every 2 minutes
    return () => clearInterval(interval);
  }, []);

  const loadBuildingStatus = async () => {
    try {
      const [systemsResponse, maintenanceResponse] = await Promise.all([
        api.get('/building/systems/status'),
        api.get('/building/maintenance/upcoming')
      ]);
      
      setSystems(systemsResponse.data);
      setMaintenance(maintenanceResponse.data);
    } catch {
      // Fallback data for development
      setSystems([
        {
          id: '1',
          name: 'Sistema de Acceso',
          category: 'Seguridad',
          status: 'online',
          details: 'Funcionando correctamente',
          lastCheck: new Date(Date.now() - 5 * 60 * 1000),
          icon: '🔐'
        },
        {
          id: '2',
          name: 'Cámaras de Seguridad',
          category: 'Vigilancia',
          status: 'warning',
          details: '22 de 24 cámaras activas',
          lastCheck: new Date(Date.now() - 10 * 60 * 1000),
          icon: '📹'
        },
        {
          id: '3',
          name: 'Intercomunicadores',
          category: 'Comunicación',
          status: 'online',
          details: 'Todos los pisos operativos',
          lastCheck: new Date(Date.now() - 2 * 60 * 1000),
          icon: '📞'
        },
        {
          id: '4',
          name: 'Iluminación LED',
          category: 'Eléctrico',
          status: 'online',
          details: 'Sensores de movimiento activos',
          lastCheck: new Date(Date.now() - 15 * 60 * 1000),
          icon: '💡'
        },
        {
          id: '5',
          name: 'Sensores de Humo',
          category: 'Seguridad',
          status: 'offline',
          details: 'Piso 3 - Sensor desconectado',
          lastCheck: new Date(Date.now() - 30 * 60 * 1000),
          icon: '🚨'
        },
        {
          id: '6',
          name: 'Conectividad',
          category: 'Red',
          status: 'online',
          details: 'WiFi y Ethernet estables',
          lastCheck: new Date(Date.now() - 1 * 60 * 1000),
          icon: '🌐'
        }
      ]);

      setMaintenance([
        {
          id: '1',
          system: 'Ascensores',
          type: 'Mantenimiento preventivo',
          scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          duration: '4 horas'
        },
        {
          id: '2',
          system: 'Sistema de Incendios',
          type: 'Inspección mensual',
          scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          duration: '2 horas'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status: SystemStatus['status']) => {
    switch (status) {
      case 'online': return 'En línea';
      case 'warning': return 'Advertencia';
      case 'offline': return 'Fuera de línea';
    }
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString('es-UY', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Container>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
                <div>
                  <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
                  <div className="w-32 h-3 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              </div>
              <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="space-y-0">
        {systems.map(system => (
          <SystemItem key={system.id}>
            <SystemInfo>
              <span className="text-2xl">{system.icon}</span>
              <div>
                <SystemName>{system.name}</SystemName>
                <SystemDetails>{system.details}</SystemDetails>
              </div>
            </SystemInfo>
            
            <StatusIndicator status={system.status}>
              <div className="status-dot" />
              <span className="status-text">
                {getStatusText(system.status)}
              </span>
            </StatusIndicator>
          </SystemItem>
        ))}
      </div>

      {maintenance.length > 0 && (
        <MaintenanceAlert>
          <MaintenanceTitle>
            🔧 Mantenimiento Programado
          </MaintenanceTitle>
          {maintenance.map(item => (
            <MaintenanceText key={item.id}>
              <strong>{item.system}</strong> - {item.type}
              <br />
              {formatDateTime(item.scheduledDate)} ({item.duration})
            </MaintenanceText>
          ))}
        </MaintenanceAlert>
      )}
    </Container>
  );
}