"use client";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter, Settings, Monitor, Grid, List } from 'lucide-react';
import { useState } from 'react';

export function CamerasHeader() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sistema de Cámaras</h2>
          <p className="text-muted-foreground">
            Monitoreo y gestión de cámaras de seguridad
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto">
            <Monitor className="h-4 w-4 mr-2" />
            Vista Completa
          </Button>
          
          <Button variant="outline" className="w-full sm:w-auto">
            <Settings className="h-4 w-4 mr-2" />
            Configurar
          </Button>

          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Cámara
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="default" className="bg-green-500">
            24 En línea
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="destructive">
            2 Fuera de línea
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            1 Mantenimiento
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            27 Total
          </Badge>
        </div>
      </div>

      {/* Filters and View Toggle */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar cámaras..."
              className="pl-10"
            />
          </div>
          
          <Select>
            <SelectTrigger className="w-full sm:w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Edificio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="oceania">Torre Oceanía</SelectItem>
              <SelectItem value="vistamar">Vista Mar</SelectItem>
              <SelectItem value="carrasco">Carrasco</SelectItem>
            </SelectContent>
          </Select>

          <Select>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="online">En línea</SelectItem>
              <SelectItem value="offline">Fuera de línea</SelectItem>
              <SelectItem value="maintenance">Mantenimiento</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* View Mode Toggle */}
        <div className="flex border rounded-lg p-1">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}