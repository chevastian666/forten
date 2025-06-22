import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { AppLayout } from '@/components/layout/AppLayout';
import { CamerasHeader } from './components/CamerasHeader';

// Dynamically import video-heavy components
const CamerasGrid = dynamic(() => import('./components/CamerasGrid').then(mod => ({ default: mod.CamerasGrid })), {
  loading: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="animate-pulse bg-muted rounded-lg h-64" />
      ))}
    </div>
  )
});

const CamerasList = dynamic(() => import('./components/CamerasList').then(mod => ({ default: mod.CamerasList })), {
  loading: () => (
    <div className="animate-pulse bg-muted rounded-lg h-96" />
  )
});

export default function CamerasPage() {
  return (
    <AppLayout title="Sistema de Cámaras">
      <div className="space-y-6">
        <CamerasHeader />
        <Suspense fallback={<div>Cargando cámaras...</div>}>
          <CamerasGrid />
        </Suspense>
        <Suspense fallback={<div>Cargando lista...</div>}>
          <CamerasList />
        </Suspense>
      </div>
    </AppLayout>
  );
}