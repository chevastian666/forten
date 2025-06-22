"use client";

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


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

  const getStatusVariant = (status: AccessEntry['status']) => {
    switch (status) {
      case 'granted': return 'default';
      case 'expired': return 'secondary';
      case 'denied': return 'destructive';
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
            <TableHead>Método</TableHead>
            <TableHead>Ubicación</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Tiempo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map(entry => (
            <TableRow key={entry.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getTypeIcon(entry.type)}</span>
                  <div>
                    <div className="font-medium">{entry.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {entry.apartment && `${entry.apartment} • `}
                      {entry.authorizedBy && `Autorizado por ${entry.authorizedBy}`}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span>{getMethodIcon(entry.method)}</span>
                  <span className="text-sm text-muted-foreground">
                    {entry.method.toUpperCase()}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm">
                  {entry.location}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(entry.status)}>
                  {getStatusText(entry.status)}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {formatTimeAgo(entry.timestamp)}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}