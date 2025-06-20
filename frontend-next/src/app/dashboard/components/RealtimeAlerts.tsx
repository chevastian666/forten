"use client";

import { useState, useEffect } from 'react';
import { SecurityAlert } from '@/components/design-system';
import { api } from '@/lib/api';
import { useNotifications } from '@/contexts/NotificationContext';

interface Alert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  location?: string;
  timestamp: Date;
  status: 'active' | 'acknowledged' | 'resolved';
  assignedTo?: string;
}

export function RealtimeAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const { addNotification } = useNotifications();

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 30000); // Refresh every 30 seconds
    
    // Setup WebSocket for real-time updates
    setupWebSocket();
    
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async () => {
    try {
      const response = await api.get('/alerts/active');
      setAlerts(response.data);
    } catch {
      // Fallback data for development
      setAlerts([
        {
          id: '1',
          type: 'motion',
          severity: 'high',
          title: 'Movimiento detectado',
          description: 'Actividad inusual en el estacionamiento nivel -2',
          location: 'Estacionamiento -2',
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
          status: 'active'
        },
        {
          id: '2',
          type: 'access',
          severity: 'medium',
          title: 'Acceso denegado múltiple',
          description: '3 intentos fallidos de acceso en entrada principal',
          location: 'Entrada Principal',
          timestamp: new Date(Date.now() - 15 * 60 * 1000),
          status: 'acknowledged',
          assignedTo: 'Juan Pérez'
        },
        {
          id: '3',
          type: 'alarm',
          severity: 'low',
          title: 'Puerta abierta',
          description: 'Puerta de emergencia piso 5 abierta por más de 5 minutos',
          location: 'Piso 5',
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
          status: 'active'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const setupWebSocket = () => {
    // In production, connect to real WebSocket
    // const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL);
    // ws.onmessage = (event) => {
    //   const alert = JSON.parse(event.data);
    //   handleNewAlert(alert);
    // };
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleNewAlert = (alert: Alert) => {
    setAlerts(prev => [alert, ...prev]);
    
    // Add browser notification
    addNotification({
      type: alert.severity === 'critical' ? 'error' : 'warning',
      title: alert.title,
      message: alert.description
    });
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      await api.post(`/alerts/${alertId}/acknowledge`);
      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId ? { ...alert, status: 'acknowledged' } : alert
        )
      );
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      await api.post(`/alerts/${alertId}/resolve`);
      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId ? { ...alert, status: 'resolved' } : alert
        )
      );
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const handleView = (alertId: string) => {
    // Navigate to alert details
    window.location.href = `/alerts/${alertId}`;
  };

  const handleDismiss = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
        <span className="text-4xl mb-2">✅</span>
        <p className="text-gray-600 dark:text-gray-400">
          No hay alertas activas en este momento
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[600px] overflow-y-auto">
      {alerts.map(alert => (
        <SecurityAlert
          key={alert.id}
          {...alert}
          onAcknowledge={() => handleAcknowledge(alert.id)}
          onResolve={() => handleResolve(alert.id)}
          onView={() => handleView(alert.id)}
          onDismiss={() => handleDismiss(alert.id)}
          dismissible={alert.status === 'resolved'}
        />
      ))}
    </div>
  );
}