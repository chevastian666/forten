import { Suspense } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { EventsHeader } from './components/EventsHeader';
import { EventsList } from './components/EventsList';

export default function EventsPage() {
  return (
    <AppLayout title="Sistema de Eventos">
      <div className="space-y-6">
        <EventsHeader />
        <Suspense fallback={<div>Cargando eventos...</div>}>
          <EventsList />
        </Suspense>
      </div>
    </AppLayout>
  );
}