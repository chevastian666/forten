import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardMetrics } from './components/DashboardMetrics';
import { DashboardSkeleton } from './components/DashboardSkeleton';

// Dynamically import heavy components with loading states
const RealtimeAlerts = dynamic(() => import('./components/RealtimeAlerts').then(mod => ({ default: mod.RealtimeAlerts })), {
  loading: () => <div className="animate-pulse h-64 bg-muted rounded-lg" />
});

const CameraGrid = dynamic(() => import('./components/CameraGrid').then(mod => ({ default: mod.CameraGrid })), {
  loading: () => <div className="animate-pulse h-96 bg-muted rounded-lg" />
});

const AccessActivity = dynamic(() => import('./components/AccessActivity').then(mod => ({ default: mod.AccessActivity })), {
  loading: () => <div className="animate-pulse h-80 bg-muted rounded-lg" />
});

const BuildingStatus = dynamic(() => import('./components/BuildingStatus').then(mod => ({ default: mod.BuildingStatus })), {
  loading: () => <div className="animate-pulse h-64 bg-muted rounded-lg" />
});

const QuickActions = dynamic(() => import('./components/QuickActions').then(mod => ({ default: mod.QuickActions })), {
  loading: () => <div className="animate-pulse h-48 bg-muted rounded-lg" />
});

export default function DashboardPage() {
  return (
    <AppLayout title="Dashboard">
      <Suspense fallback={<DashboardSkeleton />}>
        {/* Metrics Row */}
        <div className="mb-8">
          <DashboardMetrics />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - 2 cols */}
          <div className="lg:col-span-2 space-y-8">
            {/* Camera Grid */}
            <section>
              <h2 className="text-xl font-semibold mb-4">
                Cámaras en Vivo
              </h2>
              <CameraGrid />
            </section>

            {/* Access Activity */}
            <section>
              <h2 className="text-xl font-semibold mb-4">
                Actividad de Accesos
              </h2>
              <AccessActivity />
            </section>
          </div>

          {/* Right Column - 1 col */}
          <div className="space-y-8">
            {/* Real-time Alerts */}
            <section>
              <h2 className="text-xl font-semibold mb-4">
                Alertas en Tiempo Real
              </h2>
              <RealtimeAlerts />
            </section>

            {/* Building Status */}
            <section>
              <h2 className="text-xl font-semibold mb-4">
                Estado del Edificio
              </h2>
              <BuildingStatus />
            </section>

            {/* Quick Actions */}
            <section>
              <h2 className="text-xl font-semibold mb-4">
                Acciones Rápidas
              </h2>
              <QuickActions />
            </section>
          </div>
        </div>
      </Suspense>
    </AppLayout>
  );
}