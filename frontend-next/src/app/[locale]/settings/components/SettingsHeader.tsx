"use client";

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, RotateCcw, Download, Upload } from 'lucide-react';

export function SettingsHeader() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Configuración del Sistema</h2>
          <p className="text-muted-foreground">
            Administra la configuración general del sistema FORTEN
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" />
            Exportar Config
          </Button>
          
          <Button variant="outline" className="w-full sm:w-auto">
            <Upload className="h-4 w-4 mr-2" />
            Importar Config
          </Button>

          <Button variant="outline" className="w-full sm:w-auto">
            <RotateCcw className="h-4 w-4 mr-2" />
            Restaurar
          </Button>

          <Button className="w-full sm:w-auto">
            <Save className="h-4 w-4 mr-2" />
            Guardar Cambios
          </Button>
        </div>
      </div>

      {/* System Status */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="default" className="bg-green-500">
            Sistema Operativo
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            Versión 2.1.4
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            Última actualización: Hoy
          </Badge>
        </div>
      </div>
    </div>
  );
}