"use client";

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useNotifications } from '@/contexts/NotificationContext';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, XCircle, Eye } from 'lucide-react';

interface SecurityAlert {
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
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
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
  const handleNewAlert = (alert: SecurityAlert) => {
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

  const getSeverityVariant = (severity: SecurityAlert['severity']) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity: SecurityAlert['severity']) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <XCircle className="h-4 w-4" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4" />;
      case 'low':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="text-4xl mb-2">✅</div>
        <p className="text-muted-foreground">
          No hay alertas activas en este momento
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4 max-h-[600px] overflow-y-auto">
      {alerts.map(alert => (
        <Alert key={alert.id} className="border">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {getSeverityIcon(alert.severity)}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTitle className="text-sm font-medium">
                    {alert.title}
                  </AlertTitle>
                  <Badge variant={getSeverityVariant(alert.severity)} className="text-xs">
                    {alert.severity.toUpperCase()}
                  </Badge>
                </div>
                <AlertDescription className="text-sm">
                  {alert.description}
                </AlertDescription>
                {alert.location && (
                  <p className="text-xs text-muted-foreground mt-1">
                    📍 {alert.location}
                  </p>
                )}
                {alert.assignedTo && (
                  <p className="text-xs text-muted-foreground">
                    👤 Asignado a: {alert.assignedTo}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 ml-4">
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleView(alert.id)}
                  className="h-8 w-8 p-0"
                >
                  <Eye className="h-3 w-3" />
                </Button>
                {alert.status === 'active' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAcknowledge(alert.id)}
                      className="h-8 px-2 text-xs"
                    >
                      Reconocer
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleResolve(alert.id)}
                      className="h-8 px-2 text-xs"
                    >
                      Resolver
                    </Button>
                  </>
                )}
                {alert.status === 'resolved' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDismiss(alert.id)}
                    className="h-8 px-2 text-xs"
                  >
                    Descartar
                  </Button>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(alert.timestamp).toLocaleTimeString('es-UY')}
              </span>
            </div>
          </div>
        </Alert>
      ))}
    </div>
  );
}