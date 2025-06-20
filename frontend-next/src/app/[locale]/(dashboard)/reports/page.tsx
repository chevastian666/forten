/**
 * Reports Page
 * Reports management page
 */

import { ReportsManagement } from '@/components/analytics';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reportes | FORTEN CRM',
  description: 'Gestión de reportes del sistema FORTEN'
};

export default function ReportsPage() {
  return (
    <div className="container mx-auto p-6">
      <ReportsManagement />
    </div>
  );
}