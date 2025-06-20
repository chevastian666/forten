import { Suspense } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { SettingsHeader } from './components/SettingsHeader';
import { SettingsTabs } from './components/SettingsTabs';

export default function SettingsPage() {
  return (
    <AppLayout title="Configuración del Sistema">
      <div className="space-y-6">
        <SettingsHeader />
        <Suspense fallback={<div>Cargando configuración...</div>}>
          <SettingsTabs />
        </Suspense>
      </div>
    </AppLayout>
  );
}