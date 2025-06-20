import { Suspense } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ResidentsList } from './components/ResidentsList';
import { ResidentsHeader } from './components/ResidentsHeader';

export default function ResidentsPage() {
  return (
    <AppLayout title="Residentes">
      <div className="space-y-6">
        <ResidentsHeader />
        <Suspense fallback={<div>Cargando residentes...</div>}>
          <ResidentsList />
        </Suspense>
      </div>
    </AppLayout>
  );
}