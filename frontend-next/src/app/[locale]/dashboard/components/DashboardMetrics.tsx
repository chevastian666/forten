import { api } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Metric {
  label: string;
  value: number | string;
  change?: number;
  unit?: string;
  icon: string;
  color: string;
}

async function getMetrics(): Promise<Metric[]> {
  try {
    const response = await api.get('/analytics/dashboard/metrics');
    const data = response.data;

    return [
      {
        label: 'Residentes Activos',
        value: data.summary.activeResidents,
        unit: 'personas',
        icon: '👥',
        color: 'blue'
      },
      {
        label: 'Visitantes Hoy',
        value: data.summary.visitorsToday,
        change: 12,
        unit: 'accesos',
        icon: '🚶',
        color: 'green'
      },
      {
        label: 'Alertas Activas',
        value: data.summary.activeAlerts,
        unit: 'alertas',
        icon: '🚨',
        color: data.summary.activeAlerts > 0 ? 'red' : 'gray'
      },
      {
        label: 'Cámaras',
        value: data.summary.cameraStatus,
        icon: '📹',
        color: 'purple'
      }
    ];
  } catch {
    // Fallback data for development
    return [
      {
        label: 'Residentes Activos',
        value: 234,
        unit: 'personas',
        icon: '👥',
        color: 'blue'
      },
      {
        label: 'Visitantes Hoy',
        value: 45,
        change: 12,
        unit: 'accesos',
        icon: '🚶',
        color: 'green'
      },
      {
        label: 'Alertas Activas',
        value: 3,
        unit: 'alertas',
        icon: '🚨',
        color: 'red'
      },
      {
        label: 'Cámaras',
        value: '22/24 activas',
        icon: '📹',
        color: 'purple'
      }
    ];
  }
}

export async function DashboardMetrics() {
  const metrics = await getMetrics();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric, index) => (
        <Card key={index} className="p-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <span className="text-3xl">{metric.icon}</span>
            {metric.change !== undefined && (
              <Badge 
                variant={metric.change > 0 ? "default" : "destructive"}
                className="text-xs"
              >
                {metric.change > 0 ? '+' : ''}{metric.change}%
              </Badge>
            )}
          </CardHeader>
          
          <CardContent className="p-0">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              {metric.label}
            </h3>
            
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold">
                {metric.value}
              </p>
              {metric.unit && (
                <span className="text-sm text-muted-foreground">
                  {metric.unit}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}