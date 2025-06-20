"use client";

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Edit, 
  Trash2, 
  Eye,
  Phone,
  Mail,
  Building,
  Key
} from 'lucide-react';
import { api } from '@/lib/api';

interface Resident {
  id: string;
  name: string;
  email: string;
  phone: string;
  apartment: string;
  building: string;
  status: 'active' | 'inactive';
  registrationDate: Date;
  lastAccess: Date;
  avatar?: string;
  hasApp: boolean;
  emergencyContact?: string;
}

export function ResidentsList() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResidents();
  }, []);

  const loadResidents = async () => {
    try {
      const response = await api.get('/residents');
      setResidents(response.data);
    } catch {
      // Fallback data for development
      setResidents([
        {
          id: '1',
          name: 'María García',
          email: 'maria.garcia@email.com',
          phone: '+598 99 123 456',
          apartment: 'Apto 501',
          building: 'Torre Oceanía',
          status: 'active',
          registrationDate: new Date('2024-01-15'),
          lastAccess: new Date(Date.now() - 2 * 60 * 60 * 1000),
          hasApp: true,
          emergencyContact: '+598 99 654 321'
        },
        {
          id: '2',
          name: 'Juan Pérez',
          email: 'juan.perez@email.com',
          phone: '+598 99 234 567',
          apartment: 'Apto 302',
          building: 'Vista Mar',
          status: 'active',
          registrationDate: new Date('2024-02-20'),
          lastAccess: new Date(Date.now() - 5 * 60 * 60 * 1000),
          hasApp: false,
          emergencyContact: '+598 99 765 432'
        },
        {
          id: '3',
          name: 'Ana Silva',
          email: 'ana.silva@email.com',
          phone: '+598 99 345 678',
          apartment: 'Apto 105',
          building: 'Torre Oceanía',
          status: 'active',
          registrationDate: new Date('2023-12-10'),
          lastAccess: new Date(Date.now() - 24 * 60 * 60 * 1000),
          hasApp: true,
          emergencyContact: '+598 99 876 543'
        },
        {
          id: '4',
          name: 'Carlos Rodriguez',
          email: 'carlos.rodriguez@email.com',
          phone: '+598 99 456 789',
          apartment: 'Apto 801',
          building: 'Carrasco',
          status: 'inactive',
          registrationDate: new Date('2023-11-05'),
          lastAccess: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          hasApp: false
        },
        {
          id: '5',
          name: 'Laura Fernández',
          email: 'laura.fernandez@email.com',
          phone: '+598 99 567 890',
          apartment: 'Apto 203',
          building: 'Vista Mar',
          status: 'active',
          registrationDate: new Date('2024-03-01'),
          lastAccess: new Date(Date.now() - 1 * 60 * 60 * 1000),
          hasApp: true,
          emergencyContact: '+598 99 987 654'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: Resident['status']) => {
    return status === 'active' ? 'default' : 'secondary';
  };

  const getStatusText = (status: Resident['status']) => {
    return status === 'active' ? 'Activo' : 'Inactivo';
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-UY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatLastAccess = (date: Date) => {
    const hours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
    if (hours < 24) return `Hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Hace ${days}d`;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
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
            <TableHead>Residente</TableHead>
            <TableHead>Contacto</TableHead>
            <TableHead>Ubicación</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Último Acceso</TableHead>
            <TableHead>App</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {residents.map(resident => (
            <TableRow key={resident.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={resident.avatar} />
                    <AvatarFallback>{getInitials(resident.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{resident.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Registro: {formatDate(resident.registrationDate)}
                    </div>
                  </div>
                </div>
              </TableCell>
              
              <TableCell>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    {resident.email}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    {resident.phone}
                  </div>
                </div>
              </TableCell>
              
              <TableCell>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Building className="h-3 w-3 text-muted-foreground" />
                    {resident.building}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Key className="h-3 w-3" />
                    {resident.apartment}
                  </div>
                </div>
              </TableCell>
              
              <TableCell>
                <Badge variant={getStatusVariant(resident.status)}>
                  {getStatusText(resident.status)}
                </Badge>
              </TableCell>
              
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {formatLastAccess(resident.lastAccess)}
                </span>
              </TableCell>
              
              <TableCell>
                <Badge variant={resident.hasApp ? "default" : "outline"}>
                  {resident.hasApp ? "Instalada" : "No instalada"}
                </Badge>
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
                      Ver perfil
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Key className="h-4 w-4 mr-2" />
                      Gestionar accesos
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