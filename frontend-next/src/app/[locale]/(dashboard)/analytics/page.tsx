/**
 * Analytics Page
 * Main analytics and reporting page
 */

import { AnalyticsDashboard } from '@/components/analytics';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Analytics | FORTEN CRM',
  description: 'Panel de analytics y reportes del sistema FORTEN'
};

export default function AnalyticsPage() {
  return (
    <div className="container mx-auto p-6">
      <AnalyticsDashboard />
    </div>
  );
}