/**
 * Analytics Configuration
 * Configuration constants for analytics and reporting
 */

export const ANALYTICS_CONFIG = {
  // Update intervals (in milliseconds)
  METRICS_UPDATE_INTERVAL: 30000, // 30 seconds
  REAL_TIME_UPDATE_INTERVAL: 5000, // 5 seconds
  ALERT_CHECK_INTERVAL: 60000, // 1 minute

  // Chart colors
  CHART_COLORS: {
    primary: '#3b82f6',
    secondary: '#10b981',
    accent: '#f59e0b',
    danger: '#ef4444',
    warning: '#f97316',
    info: '#06b6d4',
    success: '#22c55e',
    neutral: '#6b7280'
  },

  // Chart gradients
  CHART_GRADIENTS: {
    blue: ['rgba(59, 130, 246, 0.1)', 'rgba(59, 130, 246, 0)'],
    green: ['rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0)'],
    orange: ['rgba(245, 158, 11, 0.1)', 'rgba(245, 158, 11, 0)'],
    red: ['rgba(239, 68, 68, 0.1)', 'rgba(239, 68, 68, 0)']
  },

  // Default dashboard layouts
  DASHBOARD_LAYOUTS: {
    operations: {
      id: 'operations-dashboard',
      name: 'Dashboard Operacional',
      description: 'Métricas operacionales en tiempo real',
      layout: 'grid' as const,
      refreshInterval: 30000,
      widgets: [
        {
          id: 'access-metrics',
          type: 'metric' as const,
          title: 'Accesos Hoy',
          position: { x: 0, y: 0, w: 3, h: 2 },
          config: {
            refreshInterval: 30000,
            aggregation: 'sum' as const
          },
          data: null
        },
        {
          id: 'active-alerts',
          type: 'metric' as const,
          title: 'Alertas Activas',
          position: { x: 3, y: 0, w: 3, h: 2 },
          config: {
            refreshInterval: 10000,
            aggregation: 'count' as const
          },
          data: null
        },
        {
          id: 'response-time',
          type: 'metric' as const,
          title: 'Tiempo de Respuesta',
          position: { x: 6, y: 0, w: 3, h: 2 },
          config: {
            refreshInterval: 60000,
            aggregation: 'avg' as const
          },
          data: null
        },
        {
          id: 'occupancy-rate',
          type: 'metric' as const,
          title: 'Tasa de Ocupación',
          position: { x: 9, y: 0, w: 3, h: 2 },
          config: {
            refreshInterval: 3600000,
            aggregation: 'avg' as const
          },
          data: null
        },
        {
          id: 'access-trend',
          type: 'chart' as const,
          title: 'Tendencia de Accesos',
          position: { x: 0, y: 2, w: 6, h: 4 },
          config: {
            chartType: 'line' as const,
            showLegend: true,
            showGrid: true,
            colors: ['#3b82f6']
          },
          data: null
        },
        {
          id: 'alerts-by-type',
          type: 'chart' as const,
          title: 'Alertas por Tipo',
          position: { x: 6, y: 2, w: 6, h: 4 },
          config: {
            chartType: 'pie' as const,
            showLegend: true,
            colors: ['#ef4444', '#f97316', '#f59e0b', '#22c55e']
          },
          data: null
        },
        {
          id: 'access-heatmap',
          type: 'map' as const,
          title: 'Mapa de Calor - Accesos',
          position: { x: 0, y: 6, w: 12, h: 4 },
          config: {
            refreshInterval: 60000
          },
          data: null
        }
      ]
    },
    financial: {
      id: 'financial-dashboard',
      name: 'Dashboard Financiero',
      description: 'Métricas financieras y de cobranza',
      layout: 'grid' as const,
      refreshInterval: 3600000, // 1 hour
      widgets: [
        {
          id: 'total-revenue',
          type: 'metric' as const,
          title: 'Ingresos Totales',
          position: { x: 0, y: 0, w: 3, h: 2 },
          config: {
            refreshInterval: 3600000,
            aggregation: 'sum' as const
          },
          data: null
        },
        {
          id: 'collection-rate',
          type: 'metric' as const,
          title: 'Tasa de Cobro',
          position: { x: 3, y: 0, w: 3, h: 2 },
          config: {
            refreshInterval: 3600000,
            aggregation: 'avg' as const
          },
          data: null
        },
        {
          id: 'outstanding-payments',
          type: 'metric' as const,
          title: 'Pagos Pendientes',
          position: { x: 6, y: 0, w: 3, h: 2 },
          config: {
            refreshInterval: 3600000,
            aggregation: 'sum' as const
          },
          data: null
        },
        {
          id: 'net-income',
          type: 'metric' as const,
          title: 'Ingreso Neto',
          position: { x: 9, y: 0, w: 3, h: 2 },
          config: {
            refreshInterval: 3600000,
            aggregation: 'sum' as const
          },
          data: null
        },
        {
          id: 'revenue-trend',
          type: 'chart' as const,
          title: 'Evolución de Ingresos',
          position: { x: 0, y: 2, w: 6, h: 4 },
          config: {
            chartType: 'area' as const,
            showLegend: true,
            showGrid: true,
            colors: ['#10b981']
          },
          data: null
        },
        {
          id: 'expense-breakdown',
          type: 'chart' as const,
          title: 'Desglose de Gastos',
          position: { x: 6, y: 2, w: 6, h: 4 },
          config: {
            chartType: 'donut' as const,
            showLegend: true,
            colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6b7280']
          },
          data: null
        },
        {
          id: 'payment-status',
          type: 'table' as const,
          title: 'Estado de Pagos por Unidad',
          position: { x: 0, y: 6, w: 12, h: 4 },
          config: {
            refreshInterval: 3600000
          },
          data: null
        }
      ]
    },
    maintenance: {
      id: 'maintenance-dashboard',
      name: 'Dashboard de Mantenimiento',
      description: 'Seguimiento de solicitudes y mantenimiento',
      layout: 'grid' as const,
      refreshInterval: 60000,
      widgets: [
        {
          id: 'total-requests',
          type: 'metric' as const,
          title: 'Solicitudes Totales',
          position: { x: 0, y: 0, w: 3, h: 2 },
          config: {
            refreshInterval: 60000,
            aggregation: 'count' as const
          },
          data: null
        },
        {
          id: 'pending-requests',
          type: 'metric' as const,
          title: 'Solicitudes Pendientes',
          position: { x: 3, y: 0, w: 3, h: 2 },
          config: {
            refreshInterval: 30000,
            aggregation: 'count' as const
          },
          data: null
        },
        {
          id: 'avg-resolution-time',
          type: 'metric' as const,
          title: 'Tiempo Promedio Resolución',
          position: { x: 6, y: 0, w: 3, h: 2 },
          config: {
            refreshInterval: 300000,
            aggregation: 'avg' as const
          },
          data: null
        },
        {
          id: 'satisfaction-rating',
          type: 'metric' as const,
          title: 'Satisfacción',
          position: { x: 9, y: 0, w: 3, h: 2 },
          config: {
            refreshInterval: 3600000,
            aggregation: 'avg' as const
          },
          data: null
        },
        {
          id: 'requests-by-category',
          type: 'chart' as const,
          title: 'Solicitudes por Categoría',
          position: { x: 0, y: 2, w: 6, h: 4 },
          config: {
            chartType: 'bar' as const,
            showLegend: false,
            showGrid: true,
            colors: ['#3b82f6']
          },
          data: null
        },
        {
          id: 'cost-analysis',
          type: 'chart' as const,
          title: 'Análisis de Costos',
          position: { x: 6, y: 2, w: 6, h: 4 },
          config: {
            chartType: 'bar' as const,
            showLegend: true,
            showGrid: true,
            colors: ['#10b981', '#ef4444']
          },
          data: null
        },
        {
          id: 'active-requests',
          type: 'list' as const,
          title: 'Solicitudes Activas',
          position: { x: 0, y: 6, w: 12, h: 4 },
          config: {
            refreshInterval: 30000
          },
          data: null
        }
      ]
    }
  },

  // Report templates
  REPORT_TEMPLATES: {
    ACCESS_MONTHLY: 'access-monthly',
    SECURITY_WEEKLY: 'security-weekly',
    FINANCIAL_QUARTERLY: 'financial-quarterly',
    MAINTENANCE_MONTHLY: 'maintenance-monthly',
    CUSTOM: 'custom'
  },

  // Alert thresholds
  DEFAULT_ALERT_THRESHOLDS: {
    HIGH_ACCESS_RATE: 100, // accesses per hour
    LOW_COLLECTION_RATE: 90, // percentage
    HIGH_RESPONSE_TIME: 15, // minutes
    HIGH_PENDING_MAINTENANCE: 20, // requests
    LOW_SATISFACTION: 3.5 // out of 5
  },

  // Export settings
  EXPORT_SETTINGS: {
    PDF: {
      orientation: 'portrait',
      format: 'a4',
      margins: { top: 20, right: 20, bottom: 20, left: 20 }
    },
    EXCEL: {
      defaultSheetName: 'Datos',
      headerStyle: {
        font: { bold: true },
        fill: { fgColor: { rgb: 'FF3B82F6' } }
      }
    },
    CSV: {
      delimiter: ',',
      quote: '"',
      encoding: 'utf-8'
    }
  }
};