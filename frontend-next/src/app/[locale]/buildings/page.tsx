import { Suspense } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { BuildingsList } from './components/BuildingsList';
import { BuildingsHeader } from './components/BuildingsHeader';

export default function BuildingsPage() {
  return (
    <AppLayout title="Edificios">
      <div className="space-y-6">
        <BuildingsHeader />
        <Suspense fallback={<div>Cargando edificios...</div>}>
          <BuildingsList />
        </Suspense>
      </div>
    </AppLayout>
  );
}