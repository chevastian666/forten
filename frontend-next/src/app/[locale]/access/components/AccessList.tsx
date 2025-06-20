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
  Hash,
  User,
  Key
} from 'lucide-react';
import { api } from '@/lib/api';

interface AccessRecord {
  id: string;
  type: 'resident' | 'visitor' | 'delivery' | 'staff';
  name: string;
  apartment?: string;
  building: string;
  method: 'pin' | 'card' | 'app' | 'manual' | 'qr';
  location: string;
  status: 'granted' | 'denied' | 'expired' | 'pending';
  timestamp: Date;
  pin?: string;
  authorizedBy?: string;
  notes?: string;
  duration?: number;
  deviceId?: string;
}

export function AccessList() {
  const [records, setRecords] = useState<AccessRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAccessRecords();
    
    // Setup polling for real-time updates
    const interval = setInterval(loadAccessRecords, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAccessRecords = async () => {
    try {
      const response = await api.get('/access/records');
      setRecords(response.data);
    } catch {
      // Fallback data for development
      setRecords([
        {
          id: '1',
          type: 'visitor',
          name: 'Carlos Mendez',
          apartment: 'Apto 501',
          building: 'Torre Oceanía',
          method: 'pin',
          location: 'Entrada Principal',
          status: 'granted',
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
          pin: '1234',
          authorizedBy: 'María García',
          duration: 4
        },
        {
          id: '2',
          type: 'resident',
          name: 'Juan Pérez',
          apartment: 'Apto 302',
          building: 'Vista Mar',
          method: 'app',
          location: 'Estacionamiento',
          status: 'granted',
          timestamp: new Date(Date.now() - 12 * 60 * 1000),
          deviceId: 'MOB-001'
        },
        {
          id: '3',
          type: 'delivery',
          name: 'Pedidos Ya - Diego',
          apartment: 'Apto 702',
          building: 'Torre Oceanía',
          method: 'qr',
          location: 'Entrada Principal',
          status: 'granted',
          timestamp: new Date(Date.now() - 20 * 60 * 1000),
          authorizedBy: 'Ana Silva',
          duration: 1
        },
        {
          id: '4',
          type: 'visitor',
          name: 'Laura Fernández',
          apartment: 'Apto 405',
          building: 'Carrasco',
          method: 'pin',
          location: 'Entrada Principal',
          status: 'denied',
          timestamp: new Date(Date.now() - 35 * 60 * 1000),
          pin: '9999',
          notes: 'PIN incorrecto'
        },
        {
          id: '5',
          type: 'staff',
          name: 'Personal de Limpieza',
          building: 'Vista Mar',
          method: 'card',
          location: 'Entrada de Servicio',
          status: 'granted',
          timestamp: new Date(Date.now() - 45 * 60 * 1000),
          deviceId: 'CARD-005'
        },
        {
          id: '6',
          type: 'visitor',
          name: 'Roberto Silva',
          apartment: 'Apto 301',
          building: 'Torre Oceanía',
          method: 'pin',
          location: 'Entrada Principal',
          status: 'expired',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          pin: '5678',
          notes: 'PIN expirado'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: AccessRecord['type']) => {
    switch (type) {
      case 'resident': return <User className="h-4 w-4" />;
      case 'visitor': return <User className="h-4 w-4" />;
      case 'delivery': return <User className="h-4 w-4" />;
      case 'staff': return <User className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: AccessRecord['type']) => {
    switch (type) {
      case 'resident': return 'bg-blue-100 text-blue-800';
      case 'visitor': return 'bg-green-100 text-green-800';
      case 'delivery': return 'bg-orange-100 text-orange-800';
      case 'staff': return 'bg-purple-100 text-purple-800';
    }
  };

  const getStatusVariant = (status: AccessRecord['status']) => {
    switch (status) {
      case 'granted': return 'default';
      case 'denied': return 'destructive';
      case 'expired': return 'secondary';
      case 'pending': return 'outline';
    }
  };

  const getStatusText = (status: AccessRecord['status']) => {
    switch (status) {
      case 'granted': return 'Permitido';
      case 'denied': return 'Denegado';
      case 'expired': return 'Expirado';
      case 'pending': return 'Pendiente';
    }
  };

  const getMethodIcon = (method: AccessRecord['method']) => {
    switch (method) {
      case 'pin': return <Hash className="h-3 w-3" />;
      case 'card': return <Key className="h-3 w-3" />;
      case 'app': return <User className="h-3 w-3" />;
      case 'qr': return <Hash className="h-3 w-3" />;
      case 'manual': return <User className="h-3 w-3" />;
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
          {[1, 2, 3, 4, 5].map(i => (
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
            <TableHead>Persona</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Método</TableHead>
            <TableHead>Ubicación</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Hora</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map(record => (
            <TableRow key={record.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {getInitials(record.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{record.name}</div>
                    {record.apartment && (
                      <div className="text-sm text-muted-foreground">
                        {record.apartment} • {record.building}
                      </div>
                    )}
                    {!record.apartment && (
                      <div className="text-sm text-muted-foreground">
                        {record.building}
                      </div>
                    )}
                  </div>
                </div>
              </TableCell>
              
              <TableCell>
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(record.type)}`}>
                  {getTypeIcon(record.type)}
                  {record.type.charAt(0).toUpperCase() + record.type.slice(1)}
                </div>
              </TableCell>
              
              <TableCell>
                <div className="flex items-center gap-2">
                  {getMethodIcon(record.method)}
                  <span className="text-sm capitalize">{record.method}</span>
                  {record.pin && (
                    <Badge variant="outline" className="text-xs">
                      {record.pin}
                    </Badge>
                  )}
                </div>
              </TableCell>
              
              <TableCell>
                <div className="flex items-center gap-1 text-sm">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  {record.location}
                </div>
              </TableCell>
              
              <TableCell>
                <Badge variant={getStatusVariant(record.status)}>
                  {getStatusText(record.status)}
                </Badge>
                {record.notes && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {record.notes}
                  </div>
                )}
              </TableCell>
              
              <TableCell>
                <div className="text-sm font-medium">{formatTime(record.timestamp)}</div>
                <div className="text-xs text-muted-foreground">
                  {formatTimeAgo(record.timestamp)}
                </div>
              </TableCell>
              
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}