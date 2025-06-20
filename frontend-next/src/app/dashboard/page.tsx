import { Suspense } from 'react';
import { DashboardMetrics } from './components/DashboardMetrics';
import { RealtimeAlerts } from './components/RealtimeAlerts';
import { CameraGrid } from './components/CameraGrid';
import { AccessActivity } from './components/AccessActivity';
import { BuildingStatus } from './components/BuildingStatus';
import { QuickActions } from './components/QuickActions';
import { DashboardSkeleton } from './components/DashboardSkeleton';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Cámaras en Vivo
                </h2>
                <CameraGrid />
              </section>

              {/* Access Activity */}
              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Actividad de Accesos
                </h2>
                <AccessActivity />
              </section>
            </div>

            {/* Right Column - 1 col */}
            <div className="space-y-8">
              {/* Real-time Alerts */}
              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Alertas en Tiempo Real
                </h2>
                <RealtimeAlerts />
              </section>

              {/* Building Status */}
              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Estado del Edificio
                </h2>
                <BuildingStatus />
              </section>

              {/* Quick Actions */}
              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Acciones Rápidas
                </h2>
                <QuickActions />
              </section>
            </div>
          </div>
        </Suspense>
      </main>
    </div>
  );
}