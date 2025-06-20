"use client";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Plus, Search, Filter, Download, Key } from 'lucide-react';

export function AccessHeader() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Control de Accesos</h2>
          <p className="text-muted-foreground">
            Gestiona y monitorea todos los accesos al edificio
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Key className="h-4 w-4 mr-2" />
            Generar PIN
          </Button>
          <Button variant="outline" className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Acceso
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por nombre, PIN o apartamento..."
            className="pl-10"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <Select>
            <SelectTrigger className="w-full sm:w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="resident">Residentes</SelectItem>
              <SelectItem value="visitor">Visitantes</SelectItem>
              <SelectItem value="delivery">Delivery</SelectItem>
              <SelectItem value="staff">Personal</SelectItem>
            </SelectContent>
          </Select>

          <Select>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="granted">Permitidos</SelectItem>
              <SelectItem value="denied">Denegados</SelectItem>
              <SelectItem value="expired">Expirados</SelectItem>
            </SelectContent>
          </Select>

          <DatePickerWithRange className="w-full sm:w-auto" />

          <Button variant="outline" className="w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>
    </div>
  );
}