"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Key,
  Shield
} from 'lucide-react';
import { api } from '@/lib/api';

interface AccessMetrics {
  totalToday: number;
  granted: number;
  denied: number;
  pending: number;
  peakHour: string;
  mostActiveBuilding: string;
  avgResponseTime: number;
  securityAlerts: number;
  changeFromYesterday: number;
}

export function AccessStats() {
  const [metrics, setMetrics] = useState<AccessMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const response = await api.get('/access/metrics');
      setMetrics(response.data);
    } catch {
      // Fallback data for development
      setMetrics({
        totalToday: 142,
        granted: 128,
        denied: 14,
        pending: 3,
        peakHour: '18:00',
        mostActiveBuilding: 'Torre Oceanía',
        avgResponseTime: 2.3,
        securityAlerts: 2,
        changeFromYesterday: 12.5
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  const grantedPercentage = (metrics.granted / metrics.totalToday) * 100;
  const deniedPercentage = (metrics.denied / metrics.totalToday) * 100;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Accesses Today */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Accesos Hoy</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalToday}</div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {metrics.changeFromYesterday > 0 ? (
              <TrendingUp className="h-3 w-3 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500" />
            )}
            <span className={metrics.changeFromYesterday > 0 ? 'text-green-500' : 'text-red-500'}>
              {Math.abs(metrics.changeFromYesterday)}%
            </span>
            vs ayer
          </div>
        </CardContent>
      </Card>

      {/* Granted Access */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Accesos Permitidos</CardTitle>
          <UserCheck className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{metrics.granted}</div>
          <div className="mt-2">
            <Progress value={grantedPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {grantedPercentage.toFixed(1)}% del total
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Denied Access */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Accesos Denegados</CardTitle>
          <UserX className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{metrics.denied}</div>
          <div className="mt-2">
            <Progress value={deniedPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {deniedPercentage.toFixed(1)}% del total
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Security Alerts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Alertas de Seguridad</CardTitle>
          <Shield className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{metrics.securityAlerts}</div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={metrics.securityAlerts > 0 ? "destructive" : "secondary"}>
              {metrics.securityAlerts > 0 ? "Requiere atención" : "Todo normal"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Additional Stats */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Estadísticas Adicionales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Hora pico</span>
            </div>
            <Badge variant="outline">{metrics.peakHour}</Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Accesos pendientes</span>
            </div>
            <Badge variant="secondary">{metrics.pending}</Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">Edificio más activo</span>
            <span className="text-sm font-medium">{metrics.mostActiveBuilding}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">Tiempo promedio de respuesta</span>
            <span className="text-sm font-medium">{metrics.avgResponseTime}s</span>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="outline" className="cursor-pointer hover:bg-muted">
            Generar PIN temporal
          </Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-muted">
            Bloquear acceso
          </Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-muted">
            Ver cámaras
          </Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-muted">
            Exportar reporte
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}