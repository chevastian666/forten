'use client';

import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartData,
  ChartOptions
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import { TimeRange } from '@/services/analytics/types';
import { ANALYTICS_CONFIG } from '@/services/analytics/config';
import { useTheme } from 'next-themes';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartsGridProps {
  type: 'operations' | 'financial' | 'maintenance';
  data: any;
  timeRange: TimeRange;
}

export function ChartsGrid({ type, data, timeRange }: ChartsGridProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const chartOptions: ChartOptions<any> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: isDark ? '#e5e7eb' : '#374151',
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
        titleColor: isDark ? '#e5e7eb' : '#111827',
        bodyColor: isDark ? '#e5e7eb' : '#374151',
        borderColor: isDark ? '#374151' : '#e5e7eb',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: {
          color: isDark ? '#374151' : '#e5e7eb',
          display: false
        },
        ticks: {
          color: isDark ? '#9ca3af' : '#6b7280'
        }
      },
      y: {
        grid: {
          color: isDark ? '#374151' : '#e5e7eb'
        },
        ticks: {
          color: isDark ? '#9ca3af' : '#6b7280'
        }
      }
    }
  };

  const renderOperationsCharts = () => {
    if (!data.access || !data.security) return null;

    // Access Trend Chart
    const accessTrendData: ChartData<'line'> = {
      labels: data.access.accessTrend.slice(0, 15).map((d: any) => 
        new Date(d.timestamp).toLocaleDateString('es-UY', { day: '2-digit', month: 'short' })
      ),
      datasets: [{
        label: 'Accesos diarios',
        data: data.access.accessTrend.slice(0, 15).map((d: any) => d.value),
        borderColor: ANALYTICS_CONFIG.CHART_COLORS.primary,
        backgroundColor: `${ANALYTICS_CONFIG.CHART_COLORS.primary}20`,
        fill: true,
        tension: 0.4
      }]
    };

    // Access by Type Chart
    const accessByTypeData: ChartData<'pie'> = {
      labels: Object.keys(data.access.accessByType),
      datasets: [{
        data: Object.values(data.access.accessByType),
        backgroundColor: [
          ANALYTICS_CONFIG.CHART_COLORS.primary,
          ANALYTICS_CONFIG.CHART_COLORS.secondary,
          ANALYTICS_CONFIG.CHART_COLORS.accent,
          ANALYTICS_CONFIG.CHART_COLORS.info
        ]
      }]
    };

    // Alerts by Severity Chart
    const alertsBySeverityData: ChartData<'doughnut'> = {
      labels: Object.keys(data.security.alertsBySeverity),
      datasets: [{
        data: Object.values(data.security.alertsBySeverity),
        backgroundColor: [
          ANALYTICS_CONFIG.CHART_COLORS.danger,
          ANALYTICS_CONFIG.CHART_COLORS.warning,
          ANALYTICS_CONFIG.CHART_COLORS.accent,
          ANALYTICS_CONFIG.CHART_COLORS.info
        ]
      }]
    };

    // Peak Hours Chart
    const peakHoursData: ChartData<'bar'> = {
      labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      datasets: [{
        label: 'Accesos por hora',
        data: Array.from({ length: 24 }, (_, i) => 
          data.access.peakHours.includes(i) ? Math.floor(Math.random() * 50) + 30 : Math.floor(Math.random() * 20) + 5
        ),
        backgroundColor: ANALYTICS_CONFIG.CHART_COLORS.primary,
        borderRadius: 4
      }]
    };

    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tendencia de Accesos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Line data={accessTrendData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Accesos por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Pie data={accessByTypeData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alertas por Severidad</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Doughnut data={alertsBySeverityData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribución Horaria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Bar data={peakHoursData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderFinancialCharts = () => {
    if (!data.financial) return null;

    // Cash Flow Chart
    const cashFlowData: ChartData<'line'> = {
      labels: data.financial.cashFlow.slice(0, 15).map((d: any) => 
        new Date(d.timestamp).toLocaleDateString('es-UY', { day: '2-digit', month: 'short' })
      ),
      datasets: [{
        label: 'Flujo de caja',
        data: data.financial.cashFlow.slice(0, 15).map((d: any) => d.value),
        borderColor: ANALYTICS_CONFIG.CHART_COLORS.secondary,
        backgroundColor: `${ANALYTICS_CONFIG.CHART_COLORS.secondary}20`,
        fill: true,
        tension: 0.4
      }]
    };

    // Revenue by Category
    const revenueByCategoryData: ChartData<'bar'> = {
      labels: Object.keys(data.financial.revenueByCategory),
      datasets: [{
        label: 'Ingresos',
        data: Object.values(data.financial.revenueByCategory),
        backgroundColor: ANALYTICS_CONFIG.CHART_COLORS.secondary,
        borderRadius: 4
      }]
    };

    // Expenses by Category
    const expensesByCategoryData: ChartData<'doughnut'> = {
      labels: Object.keys(data.financial.expensesByCategory),
      datasets: [{
        data: Object.values(data.financial.expensesByCategory),
        backgroundColor: [
          ANALYTICS_CONFIG.CHART_COLORS.primary,
          ANALYTICS_CONFIG.CHART_COLORS.secondary,
          ANALYTICS_CONFIG.CHART_COLORS.accent,
          ANALYTICS_CONFIG.CHART_COLORS.warning,
          ANALYTICS_CONFIG.CHART_COLORS.neutral
        ]
      }]
    };

    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Flujo de Caja</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Line data={cashFlowData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ingresos por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Bar data={revenueByCategoryData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gastos por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Doughnut data={expensesByCategoryData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderMaintenanceCharts = () => {
    if (!data.maintenance) return null;

    // Requests by Category
    const requestsByCategoryData: ChartData<'bar'> = {
      labels: Object.keys(data.maintenance.requestsByCategory),
      datasets: [{
        label: 'Solicitudes',
        data: Object.values(data.maintenance.requestsByCategory),
        backgroundColor: ANALYTICS_CONFIG.CHART_COLORS.accent,
        borderRadius: 4
      }]
    };

    // Cost Analysis
    const costAnalysisData: ChartData<'bar'> = {
      labels: data.maintenance.costAnalysis.map((c: any) => c.category),
      datasets: [
        {
          label: 'Presupuestado',
          data: data.maintenance.costAnalysis.map((c: any) => c.budgeted),
          backgroundColor: ANALYTICS_CONFIG.CHART_COLORS.secondary
        },
        {
          label: 'Real',
          data: data.maintenance.costAnalysis.map((c: any) => c.actual),
          backgroundColor: ANALYTICS_CONFIG.CHART_COLORS.primary
        }
      ]
    };

    // Completion Status
    const completionStatusData: ChartData<'pie'> = {
      labels: ['Completadas', 'Pendientes'],
      datasets: [{
        data: [
          data.maintenance.completedRequests,
          data.maintenance.pendingRequests
        ],
        backgroundColor: [
          ANALYTICS_CONFIG.CHART_COLORS.success,
          ANALYTICS_CONFIG.CHART_COLORS.warning
        ]
      }]
    };

    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Solicitudes por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Bar data={requestsByCategoryData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Análisis de Costos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Bar data={costAnalysisData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estado de Solicitudes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Pie data={completionStatusData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tendencia de Resolución</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Line
                data={{
                  labels: Array.from({ length: 7 }, (_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() - (6 - i));
                    return date.toLocaleDateString('es-UY', { weekday: 'short' });
                  }),
                  datasets: [{
                    label: 'Tiempo promedio (horas)',
                    data: Array.from({ length: 7 }, () => Math.floor(Math.random() * 20) + 40),
                    borderColor: ANALYTICS_CONFIG.CHART_COLORS.info,
                    backgroundColor: `${ANALYTICS_CONFIG.CHART_COLORS.info}20`,
                    fill: true,
                    tension: 0.4
                  }]
                }}
                options={chartOptions}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <>
      {type === 'operations' && renderOperationsCharts()}
      {type === 'financial' && renderFinancialCharts()}
      {type === 'maintenance' && renderMaintenanceCharts()}
    </>
  );
}