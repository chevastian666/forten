import { Suspense } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { AccessList } from './components/AccessList';
import { AccessHeader } from './components/AccessHeader';
import { AccessStats } from './components/AccessStats';

export default function AccessPage() {
  return (
    <AppLayout title="Control de Accesos">
      <div className="space-y-6">
        <AccessHeader />
        <Suspense fallback={<div>Cargando estadísticas...</div>}>
          <AccessStats />
        </Suspense>
        <Suspense fallback={<div>Cargando registros...</div>}>
          <AccessList />
        </Suspense>
      </div>
    </AppLayout>
  );
}