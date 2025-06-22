"use client";

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreVertical, 
  Eye, 
  Settings, 
  Trash2, 
  Camera,
  Wifi,
  WifiOff,
  Circle,
  Download
} from 'lucide-react';
import { api } from '@/lib/api';

interface CameraListItem {
  id: string;
  name: string;
  location: string;
  building: string;
  status: 'online' | 'offline' | 'maintenance';
  ipAddress: string;
  deviceType: string;
  resolution: string;
  fps: number;
  isRecording: boolean;
  lastSeen: Date;
  uptime: number;
  storageUsed: number;
  health: 'good' | 'warning' | 'critical';
}

export function CamerasList() {
  const [cameras, setCameras] = useState<CameraListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCamerasList();
  }, []);

  const loadCamerasList = async () => {
    try {
      const response = await api.get('/cameras/list');
      setCameras(response.data);
    } catch {
      // Fallback data for development
      setCameras([
        {
          id: '1',
          name: 'Entrada Principal',
          location: 'Lobby',
          building: 'Torre Oceanía',
          status: 'online',
          ipAddress: '192.168.1.101',
          deviceType: 'IP Dome',
          resolution: '1920x1080',
          fps: 30,
          isRecording: true,
          lastSeen: new Date(Date.now() - 5 * 60 * 1000),
          uptime: 99.8,
          storageUsed: 45.2,
          health: 'good'
        },
        {
          id: '2',
          name: 'Estacionamiento',
          location: 'Nivel -1',
          building: 'Torre Oceanía',
          status: 'online',
          ipAddress: '192.168.1.102',
          deviceType: 'IP Bullet',
          resolution: '1920x1080',
          fps: 25,
          isRecording: true,
          lastSeen: new Date(Date.now() - 2 * 60 * 1000),
          uptime: 97.5,
          storageUsed: 52.8,
          health: 'warning'
        },
        {
          id: '3',
          name: 'Terraza',
          location: 'Piso 10',
          building: 'Torre Oceanía',
          status: 'maintenance',
          ipAddress: '192.168.1.103',
          deviceType: 'IP PTZ',
          resolution: '1280x720',
          fps: 15,
          isRecording: false,
          lastSeen: new Date(Date.now() - 24 * 60 * 60 * 1000),
          uptime: 0,
          storageUsed: 23.1,
          health: 'critical'
        },
        {
          id: '4',
          name: 'Piscina',
          location: 'Área recreativa',
          building: 'Vista Mar',
          status: 'online',
          ipAddress: '192.168.1.104',
          deviceType: 'IP Dome',
          resolution: '1920x1080',
          fps: 30,
          isRecording: true,
          lastSeen: new Date(Date.now() - 1 * 60 * 1000),
          uptime: 99.9,
          storageUsed: 38.7,
          health: 'good'
        },
        {
          id: '5',
          name: 'Entrada Servicio',
          location: 'Lateral',
          building: 'Vista Mar',
          status: 'offline',
          ipAddress: '192.168.1.105',
          deviceType: 'IP Bullet',
          resolution: '1280x720',
          fps: 20,
          isRecording: false,
          lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000),
          uptime: 87.3,
          storageUsed: 67.4,
          health: 'critical'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: CameraListItem['status']) => {
    switch (status) {
      case 'online':
        return <Wifi className="h-4 w-4 text-green-600" />;
      case 'offline':
        return <WifiOff className="h-4 w-4 text-red-600" />;
      case 'maintenance':
        return <Settings className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusVariant = (status: CameraListItem['status']) => {
    switch (status) {
      case 'online': return 'default';
      case 'offline': return 'destructive';
      case 'maintenance': return 'secondary';
    }
  };

  const getStatusText = (status: CameraListItem['status']) => {
    switch (status) {
      case 'online': return 'En línea';
      case 'offline': return 'Fuera de línea';
      case 'maintenance': return 'Mantenimiento';
    }
  };

  const getHealthIcon = (health: CameraListItem['health']) => {
    switch (health) {
      case 'good':
        return <Circle className="h-3 w-3 fill-green-500 text-green-500" />;
      case 'warning':
        return <Circle className="h-3 w-3 fill-yellow-500 text-yellow-500" />;
      case 'critical':
        return <Circle className="h-3 w-3 fill-red-500 text-red-500" />;
    }
  };

  const formatLastSeen = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Ahora mismo';
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Hace ${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `Hace ${diffInDays}d`;
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
            <TableHead>Cámara</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Especificaciones</TableHead>
            <TableHead>Red</TableHead>
            <TableHead>Rendimiento</TableHead>
            <TableHead>Salud</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cameras.map(camera => (
            <TableRow key={camera.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="bg-muted p-2 rounded-lg">
                    <Camera className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium">{camera.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {camera.location} • {camera.building}
                    </div>
                  </div>
                </div>
              </TableCell>
              
              <TableCell>
                <div className="flex items-center gap-2">
                  {getStatusIcon(camera.status)}
                  <Badge variant={getStatusVariant(camera.status)}>
                    {getStatusText(camera.status)}
                  </Badge>
                  {camera.isRecording && (
                    <Badge variant="outline" className="text-red-600 border-red-600 text-xs">
                      REC
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatLastSeen(camera.lastSeen)}
                </div>
              </TableCell>
              
              <TableCell>
                <div className="space-y-1 text-sm">
                  <div>{camera.deviceType}</div>
                  <div className="text-muted-foreground">
                    {camera.resolution} • {camera.fps} FPS
                  </div>
                </div>
              </TableCell>
              
              <TableCell>
                <div className="space-y-1 text-sm">
                  <div className="font-mono">{camera.ipAddress}</div>
                  <div className="text-muted-foreground">
                    Uptime: {camera.uptime}%
                  </div>
                </div>
              </TableCell>
              
              <TableCell>
                <div className="space-y-1 text-sm">
                  <div>Storage: {camera.storageUsed.toFixed(1)}%</div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${camera.storageUsed}%` }}
                    ></div>
                  </div>
                </div>
              </TableCell>
              
              <TableCell>
                <div className="flex items-center gap-2">
                  {getHealthIcon(camera.health)}
                  <span className="text-sm capitalize">{camera.health}</span>
                </div>
              </TableCell>
              
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Eye className="h-4 w-4 mr-2" />
                      Ver en vivo
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Download className="h-4 w-4 mr-2" />
                      Descargar grabación
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="h-4 w-4 mr-2" />
                      Configurar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}