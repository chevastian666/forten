"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Building, 
  Users, 
  Camera, 
  Shield, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye,
  MapPin
} from 'lucide-react';
import { api } from '@/lib/api';

interface Building {
  id: string;
  name: string;
  address: string;
  totalUnits: number;
  occupiedUnits: number;
  cameras: number;
  status: 'active' | 'inactive' | 'maintenance';
  lastUpdate: Date;
  manager: string;
}

export function BuildingsList() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBuildings();
  }, []);

  const loadBuildings = async () => {
    try {
      const response = await api.get('/buildings');
      setBuildings(response.data);
    } catch {
      // Fallback data for development
      setBuildings([
        {
          id: '1',
          name: 'Torre Oceanía',
          address: 'Montevideo 1234, Pocitos',
          totalUnits: 120,
          occupiedUnits: 98,
          cameras: 24,
          status: 'active',
          lastUpdate: new Date(Date.now() - 2 * 60 * 60 * 1000),
          manager: 'Juan Pérez'
        },
        {
          id: '2',
          name: 'Residencial Vista Mar',
          address: 'Rambla Sur 567, Malvín',
          totalUnits: 80,
          occupiedUnits: 75,
          cameras: 16,
          status: 'active',
          lastUpdate: new Date(Date.now() - 1 * 60 * 60 * 1000),
          manager: 'María García'
        },
        {
          id: '3',
          name: 'Complejo Carrasco',
          address: 'Av. Italia 890, Carrasco',
          totalUnits: 200,
          occupiedUnits: 180,
          cameras: 32,
          status: 'maintenance',
          lastUpdate: new Date(Date.now() - 24 * 60 * 60 * 1000),
          manager: 'Carlos Rodriguez'
        },
        {
          id: '4',
          name: 'Torre Central',
          address: 'Ciudad Vieja 123, Montevideo',
          totalUnits: 60,
          occupiedUnits: 45,
          cameras: 12,
          status: 'inactive',
          lastUpdate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          manager: 'Ana Silva'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: Building['status']) => {
    switch (status) {
      case 'active': return 'default';
      case 'maintenance': return 'secondary';
      case 'inactive': return 'destructive';
    }
  };

  const getStatusText = (status: Building['status']) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'maintenance': return 'Mantenimiento';
      case 'inactive': return 'Inactivo';
    }
  };

  const formatLastUpdate = (date: Date) => {
    const hours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
    if (hours < 24) return `Hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Hace ${days}d`;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {buildings.map(building => (
        <Card key={building.id} className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg">{building.name}</CardTitle>
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3 mr-1" />
                  {building.address}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={getStatusVariant(building.status)}>
                  {getStatusText(building.status)}
                </Badge>
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
                      Ver detalles
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <Building className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-sm font-medium">{building.occupiedUnits}/{building.totalUnits}</div>
                <div className="text-xs text-muted-foreground">Unidades</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-sm font-medium">{Math.round((building.occupiedUnits / building.totalUnits) * 100)}%</div>
                <div className="text-xs text-muted-foreground">Ocupación</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <Camera className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-sm font-medium">{building.cameras}</div>
                <div className="text-xs text-muted-foreground">Cámaras</div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Administrador: {building.manager}</span>
              <span>{formatLastUpdate(building.lastUpdate)}</span>
            </div>

            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" className="flex-1">
                <Shield className="h-3 w-3 mr-1" />
                Seguridad
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                <Camera className="h-3 w-3 mr-1" />
                Cámaras
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}