"use client";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter, Download, Bell, AlertTriangle, Shield, Camera } from 'lucide-react';
import { useState } from 'react';

export function EventsHeader() {
  const [timeFilter, setTimeFilter] = useState('today');

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sistema de Eventos</h2>
          <p className="text-muted-foreground">
            Monitoreo de eventos de seguridad y accesos
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          
          <Button variant="outline" className="w-full sm:w-auto">
            <Bell className="h-4 w-4 mr-2" />
            Configurar Alertas
          </Button>

          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Evento
          </Button>
        </div>
      </div>

      {/* Event Stats */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="default" className="bg-blue-500">
            <Bell className="h-3 w-3 mr-1" />
            156 Hoy
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" />
            12 Críticos
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            <Shield className="h-3 w-3 mr-1" />
            89 Accesos
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            <Camera className="h-3 w-3 mr-1" />
            55 Cámaras
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar eventos..."
              className="pl-10"
            />
          </div>
          
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="week">Esta semana</SelectItem>
              <SelectItem value="month">Este mes</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          <Select>
            <SelectTrigger className="w-full sm:w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="access">Accesos</SelectItem>
              <SelectItem value="security">Seguridad</SelectItem>
              <SelectItem value="maintenance">Mantenimiento</SelectItem>
              <SelectItem value="system">Sistema</SelectItem>
            </SelectContent>
          </Select>

          <Select>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Severidad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="critical">Crítica</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Media</SelectItem>
              <SelectItem value="low">Baja</SelectItem>
            </SelectContent>
          </Select>

          <Select>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Edificio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="oceania">Torre Oceanía</SelectItem>
              <SelectItem value="vistamar">Vista Mar</SelectItem>
              <SelectItem value="carrasco">Carrasco</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}