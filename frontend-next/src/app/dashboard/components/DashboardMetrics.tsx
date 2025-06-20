import { api } from '@/lib/api';

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
        <div
          key={index}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-3xl">{metric.icon}</span>
            {metric.change !== undefined && (
              <span className={`text-sm font-medium ${
                metric.change > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {metric.change > 0 ? '+' : ''}{metric.change}%
              </span>
            )}
          </div>
          
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {metric.label}
          </h3>
          
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {metric.value}
            </p>
            {metric.unit && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {metric.unit}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}