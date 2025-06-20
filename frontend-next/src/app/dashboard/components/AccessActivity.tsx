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
  overflow: hidden;

  .dark & {
    background: ${theme.colors.gray[800]};
    border-color: ${theme.colors.gray[700]};
  }
`;

const Table = styled.table`
  width: 100%;
  
  thead {
    background: ${theme.colors.gray[50]};
    
    .dark & {
      background: ${theme.colors.gray[700]};
    }
  }
  
  th {
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    text-align: left;
    font-size: ${theme.typography.fontSize.xs};
    font-weight: ${theme.typography.fontWeight.medium};
    color: ${theme.colors.gray[700]};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    
    .dark & {
      color: ${theme.colors.gray[300]};
    }
  }
  
  td {
    padding: ${theme.spacing.md};
    border-top: 1px solid ${theme.colors.gray[200]};
    
    .dark & {
      border-color: ${theme.colors.gray[700]};
    }
  }
  
  tbody tr:hover {
    background: ${theme.colors.gray[50]};
    
    .dark & {
      background: ${theme.colors.gray[700]};
    }
  }
`;

const StatusBadge = styled.span<{ type: 'success' | 'warning' | 'error' }>`
  display: inline-flex;
  align-items: center;
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.full};
  font-size: ${theme.typography.fontSize.xs};
  font-weight: ${theme.typography.fontWeight.medium};
  
  ${props => {
    switch (props.type) {
      case 'success':
        return `
          background: ${theme.colors.green[100]};
          color: ${theme.colors.green[800]};
          
          .dark & {
            background: ${theme.colors.green[900]};
            color: ${theme.colors.green[100]};
          }
        `;
      case 'warning':
        return `
          background: ${theme.colors.yellow[100]};
          color: ${theme.colors.yellow[800]};
          
          .dark & {
            background: ${theme.colors.yellow[900]};
            color: ${theme.colors.yellow[100]};
          }
        `;
      case 'error':
        return `
          background: ${theme.colors.red[100]};
          color: ${theme.colors.red[800]};
          
          .dark & {
            background: ${theme.colors.red[900]};
            color: ${theme.colors.red[100]};
          }
        `;
    }
  }}
`;

const TimeAgo = styled.span`
  color: ${theme.colors.gray[500]};
  font-size: ${theme.typography.fontSize.sm};
  
  .dark & {
    color: ${theme.colors.gray[400]};
  }
`;

const Name = styled.div`
  font-weight: ${theme.typography.fontWeight.medium};
  color: ${theme.colors.gray[900]};
  
  .dark & {
    color: ${theme.colors.white};
  }
`;

const Details = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.gray[600]};
  
  .dark & {
    color: ${theme.colors.gray[400]};
  }
`;

interface AccessEntry {
  id: string;
  type: 'resident' | 'visitor' | 'delivery' | 'staff';
  name: string;
  apartment?: string;
  method: 'pin' | 'card' | 'app' | 'manual';
  location: string;
  status: 'granted' | 'denied' | 'expired';
  timestamp: Date;
  authorizedBy?: string;
}

export function AccessActivity() {
  const [entries, setEntries] = useState<AccessEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAccessEntries();
    const interval = setInterval(loadAccessEntries, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const loadAccessEntries = async () => {
    try {
      const response = await api.get('/access/recent', {
        params: { limit: 10 }
      });
      setEntries(response.data);
    } catch {
      // Fallback data for development
      setEntries([
        {
          id: '1',
          type: 'visitor',
          name: 'Carlos Mendez',
          apartment: 'Apto 501',
          method: 'pin',
          location: 'Entrada Principal',
          status: 'granted',
          timestamp: new Date(Date.now() - 5 * 60 * 1000)
        },
        {
          id: '2',
          type: 'resident',
          name: 'Maria García',
          apartment: 'Apto 302',
          method: 'card',
          location: 'Estacionamiento',
          status: 'granted',
          timestamp: new Date(Date.now() - 12 * 60 * 1000)
        },
        {
          id: '3',
          type: 'delivery',
          name: 'Pedidos Ya',
          apartment: 'Apto 702',
          method: 'app',
          location: 'Entrada Principal',
          status: 'granted',
          timestamp: new Date(Date.now() - 20 * 60 * 1000),
          authorizedBy: 'Juan Pérez (Apto 702)'
        },
        {
          id: '4',
          type: 'visitor',
          name: 'Ana Silva',
          apartment: 'Apto 405',
          method: 'pin',
          location: 'Entrada Principal',
          status: 'expired',
          timestamp: new Date(Date.now() - 35 * 60 * 1000)
        },
        {
          id: '5',
          type: 'staff',
          name: 'Personal de Limpieza',
          method: 'card',
          location: 'Entrada de Servicio',
          status: 'granted',
          timestamp: new Date(Date.now() - 45 * 60 * 1000)
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: AccessEntry['type']) => {
    switch (type) {
      case 'resident': return '🏠';
      case 'visitor': return '👤';
      case 'delivery': return '📦';
      case 'staff': return '👷';
    }
  };

  const getMethodIcon = (method: AccessEntry['method']) => {
    switch (method) {
      case 'pin': return '🔢';
      case 'card': return '💳';
      case 'app': return '📱';
      case 'manual': return '🖐️';
    }
  };

  const getStatusType = (status: AccessEntry['status']): 'success' | 'warning' | 'error' => {
    switch (status) {
      case 'granted': return 'success';
      case 'expired': return 'warning';
      case 'denied': return 'error';
    }
  };

  const getStatusText = (status: AccessEntry['status']) => {
    switch (status) {
      case 'granted': return 'Permitido';
      case 'expired': return 'Expirado';
      case 'denied': return 'Denegado';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    
    if (minutes < 1) return 'Ahora mismo';
    if (minutes < 60) return `Hace ${minutes} min`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours}h`;
    
    const days = Math.floor(hours / 24);
    return `Hace ${days}d`;
  };

  if (loading) {
    return (
      <Container>
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 dark:bg-gray-700" />
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700" />
          ))}
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <Table>
        <thead>
          <tr>
            <th>Persona</th>
            <th>Método</th>
            <th>Ubicación</th>
            <th>Estado</th>
            <th>Tiempo</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(entry => (
            <tr key={entry.id}>
              <td>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getTypeIcon(entry.type)}</span>
                  <div>
                    <Name>{entry.name}</Name>
                    <Details>
                      {entry.apartment && `${entry.apartment} • `}
                      {entry.authorizedBy && `Autorizado por ${entry.authorizedBy}`}
                    </Details>
                  </div>
                </div>
              </td>
              <td>
                <div className="flex items-center gap-2">
                  <span>{getMethodIcon(entry.method)}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {entry.method.toUpperCase()}
                  </span>
                </div>
              </td>
              <td>
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {entry.location}
                </span>
              </td>
              <td>
                <StatusBadge type={getStatusType(entry.status)}>
                  {getStatusText(entry.status)}
                </StatusBadge>
              </td>
              <td>
                <TimeAgo>{formatTimeAgo(entry.timestamp)}</TimeAgo>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
}