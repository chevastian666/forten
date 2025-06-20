"use client";

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Eye,
  Camera,
  MapPin,
  AlertTriangle,
  Shield,
  Bell,
  Key,
  Settings,
  Wifi,
  WifiOff,
  Activity,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';
import { api } from '@/lib/api';

interface SecurityEvent {
  id: string;
  type: 'access' | 'security' | 'maintenance' | 'system';
  subtype: 'entry' | 'exit' | 'denied_access' | 'motion_detected' | 'alarm_triggered' | 'device_offline' | 'device_online' | 'maintenance_required' | 'system_update' | 'backup_completed';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  location: string;
  building: string;
  deviceId?: string;
  userId?: string;
  userName?: string;
  timestamp: Date;
  status: 'active' | 'resolved' | 'acknowledged' | 'investigating';
  assignedTo?: string;
  cameraId?: string;
  metadata?: {
    method?: string;
    pin?: string;
    duration?: number;
    reason?: string;
    ipAddress?: string;
    deviceType?: string;
  };
}

export function EventsList() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
    
    // Setup polling for real-time updates
    const interval = setInterval(loadEvents, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadEvents = async () => {
    try {
      const response = await api.get('/events');
      setEvents(response.data);
    } catch {
      // Fallback data for development
      setEvents([
        {
          id: '1',
          type: 'security',
          subtype: 'motion_detected',
          severity: 'medium',
          title: 'Movimiento detectado',
          description: 'Movimiento detectado en área restringida',
          location: 'Estacionamiento Nivel -2',
          building: 'Torre Oceanía',
          deviceId: 'CAM-003',
          timestamp: new Date(Date.now() - 2 * 60 * 1000),
          status: 'active',
          cameraId: 'cam_003'
        },
        {
          id: '2',
          type: 'access',
          subtype: 'denied_access',
          severity: 'high',
          title: 'Acceso denegado',
          description: 'Intento de acceso con PIN incorrecto (3 intentos)',
          location: 'Entrada Principal',
          building: 'Vista Mar',
          userId: 'unknown',
          userName: 'Desconocido',
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
          status: 'investigating',
          assignedTo: 'Seguridad',
          metadata: {
            method: 'pin',
            pin: '****',
            reason: 'PIN incorrecto múltiples veces'
          }
        },
        {
          id: '3',
          type: 'access',
          subtype: 'entry',
          severity: 'info',
          title: 'Acceso autorizado',
          description: 'Acceso autorizado mediante aplicación móvil',
          location: 'Entrada Principal',
          building: 'Carrasco',
          userId: 'user_001',
          userName: 'Juan Pérez',
          timestamp: new Date(Date.now() - 8 * 60 * 1000),
          status: 'resolved',
          metadata: {
            method: 'app',
            duration: 5
          }
        },
        {
          id: '4',
          type: 'system',
          subtype: 'device_offline',
          severity: 'critical',
          title: 'Dispositivo fuera de línea',
          description: 'Cámara de seguridad perdió conexión',
          location: 'Piscina',
          building: 'Vista Mar',
          deviceId: 'CAM-012',
          timestamp: new Date(Date.now() - 15 * 60 * 1000),
          status: 'active',
          assignedTo: 'Técnico IT',
          metadata: {
            deviceType: 'IP Camera',
            ipAddress: '192.168.1.112'
          }
        },
        {
          id: '5',
          type: 'security',
          subtype: 'alarm_triggered',
          severity: 'critical',
          title: 'Alarma activada',
          description: 'Sensor de movimiento activado fuera del horario',
          location: 'Oficina Administración',
          building: 'Torre Oceanía',
          deviceId: 'SENSOR-005',
          timestamp: new Date(Date.now() - 25 * 60 * 1000),
          status: 'acknowledged',
          assignedTo: 'Seguridad',
          cameraId: 'cam_office'
        },
        {
          id: '6',
          type: 'access',
          subtype: 'entry',
          severity: 'info',
          title: 'Acceso de visitante',
          description: 'Visitante autorizado por residente',
          location: 'Entrada Principal',
          building: 'Carrasco',
          userId: 'visitor_001',
          userName: 'María García (Visitante)',
          timestamp: new Date(Date.now() - 35 * 60 * 1000),
          status: 'resolved',
          metadata: {
            method: 'qr',
            duration: 2
          }
        },
        {
          id: '7',
          type: 'maintenance',
          subtype: 'maintenance_required',
          severity: 'medium',
          title: 'Mantenimiento requerido',
          description: 'Ascensor requiere revisión técnica programada',
          location: 'Ascensor Principal',
          building: 'Vista Mar',
          deviceId: 'ELEVATOR-001',
          timestamp: new Date(Date.now() - 45 * 60 * 1000),
          status: 'active',
          assignedTo: 'Mantenimiento'
        },
        {
          id: '8',
          type: 'system',
          subtype: 'backup_completed',
          severity: 'info',
          title: 'Backup completado',
          description: 'Backup automático de grabaciones completado exitosamente',
          location: 'Servidor Principal',
          building: 'Sistema',
          timestamp: new Date(Date.now() - 60 * 60 * 1000),
          status: 'resolved'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: SecurityEvent['type'], subtype: SecurityEvent['subtype']) => {
    switch (type) {
      case 'access':
        switch (subtype) {
          case 'entry': return <Unlock className="h-4 w-4 text-green-600" />;
          case 'exit': return <Lock className="h-4 w-4 text-blue-600" />;
          case 'denied_access': return <XCircle className="h-4 w-4 text-red-600" />;
          default: return <Key className="h-4 w-4" />;
        }
      case 'security':
        switch (subtype) {
          case 'motion_detected': return <Activity className="h-4 w-4 text-orange-600" />;
          case 'alarm_triggered': return <AlertTriangle className="h-4 w-4 text-red-600" />;
          default: return <Shield className="h-4 w-4 text-red-600" />;
        }
      case 'maintenance':
        return <Settings className="h-4 w-4 text-yellow-600" />;
      case 'system':
        switch (subtype) {
          case 'device_offline': return <WifiOff className="h-4 w-4 text-red-600" />;
          case 'device_online': return <Wifi className="h-4 w-4 text-green-600" />;
          case 'backup_completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
          default: return <Info className="h-4 w-4 text-blue-600" />;
        }
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getSeverityVariant = (severity: SecurityEvent['severity']) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      case 'info': return 'default';
    }
  };

  const getSeverityText = (severity: SecurityEvent['severity']) => {
    switch (severity) {
      case 'critical': return 'Crítica';
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      case 'info': return 'Info';
    }
  };

  const getStatusVariant = (status: SecurityEvent['status']) => {
    switch (status) {
      case 'active': return 'destructive';
      case 'resolved': return 'default';
      case 'acknowledged': return 'secondary';
      case 'investigating': return 'outline';
    }
  };

  const getStatusText = (status: SecurityEvent['status']) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'resolved': return 'Resuelto';
      case 'acknowledged': return 'Reconocido';
      case 'investigating': return 'Investigando';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-UY', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 1) return 'Ahora mismo';
    if (minutes < 60) return `Hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `Hace ${hours}h`;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-muted" />
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="h-16 bg-muted/50 border-t" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Evento</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Ubicación</TableHead>
            <TableHead>Usuario/Dispositivo</TableHead>
            <TableHead>Severidad</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Hora</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map(event => (
            <TableRow key={event.id}>
              <TableCell>
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {getTypeIcon(event.type, event.subtype)}
                  </div>
                  <div>
                    <div className="font-medium">{event.title}</div>
                    <div className="text-sm text-muted-foreground max-w-xs">
                      {event.description}
                    </div>
                    {event.metadata?.reason && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {event.metadata.reason}
                      </div>
                    )}
                  </div>
                </div>
              </TableCell>
              
              <TableCell>
                <Badge variant="outline" className="capitalize">
                  {event.type}
                </Badge>
              </TableCell>
              
              <TableCell>
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-sm">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    {event.location}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {event.building}
                  </div>
                </div>
              </TableCell>
              
              <TableCell>
                {event.userName ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {getInitials(event.userName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">{event.userName}</div>
                      {event.metadata?.method && (
                        <div className="text-xs text-muted-foreground capitalize">
                          {event.metadata.method}
                        </div>
                      )}
                    </div>
                  </div>
                ) : event.deviceId ? (
                  <div className="text-sm">
                    <div className="font-medium">{event.deviceId}</div>
                    {event.metadata?.deviceType && (
                      <div className="text-xs text-muted-foreground">
                        {event.metadata.deviceType}
                      </div>
                    )}
                    {event.metadata?.ipAddress && (
                      <div className="text-xs text-muted-foreground font-mono">
                        {event.metadata.ipAddress}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Sistema</span>
                )}
              </TableCell>
              
              <TableCell>
                <Badge variant={getSeverityVariant(event.severity)}>
                  {getSeverityText(event.severity)}
                </Badge>
              </TableCell>
              
              <TableCell>
                <div className="space-y-1">
                  <Badge variant={getStatusVariant(event.status)}>
                    {getStatusText(event.status)}
                  </Badge>
                  {event.assignedTo && (
                    <div className="text-xs text-muted-foreground">
                      Asignado: {event.assignedTo}
                    </div>
                  )}
                </div>
              </TableCell>
              
              <TableCell>
                <div className="text-sm font-medium">{formatTime(event.timestamp)}</div>
                <div className="text-xs text-muted-foreground">
                  {formatTimeAgo(event.timestamp)}
                </div>
              </TableCell>
              
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Eye className="h-4 w-4" />
                  </Button>
                  {event.cameraId && (
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Camera className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}