/**
 * WhatsApp Page
 * WhatsApp Business integration page
 */

import { WhatsAppDashboard } from '@/components/whatsapp';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'WhatsApp Business | FORTEN CRM',
  description: 'Gestión de WhatsApp Business del sistema FORTEN'
};

export default function WhatsAppPage() {
  return (
    <div className="container mx-auto p-6">
      <WhatsAppDashboard />
    </div>
  );
}