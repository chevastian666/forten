"use client";

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, XCircle, Wrench } from 'lucide-react';


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

  const getStatusVariant = (status: SystemStatus['status']) => {
    switch (status) {
      case 'online': return 'default';
      case 'warning': return 'secondary';
      case 'offline': return 'destructive';
    }
  };

  const getStatusIcon = (status: SystemStatus['status']) => {
    switch (status) {
      case 'online': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'offline': return <XCircle className="h-4 w-4 text-red-600" />;
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
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-muted rounded" />
                <div>
                  <div className="w-24 h-4 bg-muted rounded mb-1" />
                  <div className="w-32 h-3 bg-muted rounded" />
                </div>
              </div>
              <div className="w-16 h-4 bg-muted rounded" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {systems.map(system => (
          <div key={system.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{system.icon}</span>
              <div>
                <div className="font-medium">{system.name}</div>
                <div className="text-sm text-muted-foreground">{system.details}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {getStatusIcon(system.status)}
              <Badge variant={getStatusVariant(system.status)}>
                {getStatusText(system.status)}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {maintenance.length > 0 && (
        <Alert className="mt-4">
          <Wrench className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2">
              Mantenimiento Programado
            </div>
            {maintenance.map(item => (
              <div key={item.id} className="text-sm">
                <strong>{item.system}</strong> - {item.type}
                <br />
                {formatDateTime(item.scheduledDate)} ({item.duration})
              </div>
            ))}
          </AlertDescription>
        </Alert>
      )}
    </Card>
  );
}