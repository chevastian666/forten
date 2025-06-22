/**
 * WhatsApp Notification Hook
 * React hook for sending WhatsApp notifications
 */

import { useCallback, useState } from 'react';
import { whatsAppNotificationService, Resident, Visitor } from '@/services/whatsapp/notification.service';
import { toast } from 'sonner';

export function useWhatsAppNotification() {
  const [isSending, setIsSending] = useState(false);

  // Send access notification
  const sendAccessNotification = useCallback(
    async (resident: Resident, visitor: Visitor) => {
      setIsSending(true);
      try {
        const result = await whatsAppNotificationService.sendAccessNotification(resident, visitor);
        if (result.success) {
          toast.success('Access notification sent');
        } else {
          toast.error(result.error || 'Failed to send notification');
        }
        return result;
      } finally {
        setIsSending(false);
      }
    },
    []
  );

  // Send visitor arrival
  const sendVisitorArrival = useCallback(
    async (resident: Resident, visitorName: string, imageUrl?: string) => {
      setIsSending(true);
      try {
        const result = await whatsAppNotificationService.sendVisitorArrival(resident, visitorName, imageUrl);
        if (result.success) {
          toast.success('Visitor arrival notification sent');
        } else {
          toast.error(result.error || 'Failed to send notification');
        }
        return result;
      } finally {
        setIsSending(false);
      }
    },
    []
  );

  // Send delivery notification
  const sendDeliveryNotification = useCallback(
    async (resident: Resident, courierCompany: string, packageDescription: string) => {
      setIsSending(true);
      try {
        const result = await whatsAppNotificationService.sendDeliveryNotification(
          resident,
          courierCompany,
          packageDescription
        );
        if (result.success) {
          toast.success('Delivery notification sent');
        } else {
          toast.error(result.error || 'Failed to send notification');
        }
        return result;
      } finally {
        setIsSending(false);
      }
    },
    []
  );

  // Send emergency alert
  const sendEmergencyAlert = useCallback(
    async (resident: Resident, alertType: string, location: string, instructions: string) => {
      setIsSending(true);
      try {
        const result = await whatsAppNotificationService.sendEmergencyAlert(
          resident,
          alertType,
          location,
          instructions
        );
        if (result.success) {
          toast.success('Emergency alert sent');
        } else {
          toast.error(result.error || 'Failed to send alert');
        }
        return result;
      } finally {
        setIsSending(false);
      }
    },
    []
  );

  // Send maintenance notice
  const sendMaintenanceNotice = useCallback(
    async (
      resident: Resident,
      serviceType: string,
      date: string,
      time: string,
      duration: string
    ) => {
      setIsSending(true);
      try {
        const result = await whatsAppNotificationService.sendMaintenanceNotice(
          resident,
          serviceType,
          date,
          time,
          duration
        );
        if (result.success) {
          toast.success('Maintenance notice sent');
        } else {
          toast.error(result.error || 'Failed to send notice');
        }
        return result;
      } finally {
        setIsSending(false);
      }
    },
    []
  );

  // Send security alert
  const sendSecurityAlert = useCallback(
    async (
      resident: Resident,
      alertType: string,
      description: string,
      time: string,
      imageUrl?: string
    ) => {
      setIsSending(true);
      try {
        const result = await whatsAppNotificationService.sendSecurityAlert(
          resident,
          alertType,
          description,
          time,
          imageUrl
        );
        if (result.success) {
          toast.success('Security alert sent');
        } else {
          toast.error(result.error || 'Failed to send alert');
        }
        return result;
      } finally {
        setIsSending(false);
      }
    },
    []
  );

  // Send PIN notification
  const sendPinNotification = useCallback(
    async (resident: Resident, pin: string, purpose: string, validUntil: Date) => {
      setIsSending(true);
      try {
        const result = await whatsAppNotificationService.sendPinNotification(
          resident,
          pin,
          purpose,
          validUntil
        );
        if (result.success) {
          toast.success('PIN notification sent');
        } else {
          toast.error(result.error || 'Failed to send notification');
        }
        return result;
      } finally {
        setIsSending(false);
      }
    },
    []
  );

  // Send payment reminder
  const sendPaymentReminder = useCallback(
    async (resident: Resident, amount: string, dueDate: string, concept: string) => {
      setIsSending(true);
      try {
        const result = await whatsAppNotificationService.sendPaymentReminder(
          resident,
          amount,
          dueDate,
          concept
        );
        if (result.success) {
          toast.success('Payment reminder sent');
        } else {
          toast.error(result.error || 'Failed to send reminder');
        }
        return result;
      } finally {
        setIsSending(false);
      }
    },
    []
  );

  // Send welcome message
  const sendWelcomeMessage = useCallback(
    async (resident: Resident) => {
      setIsSending(true);
      try {
        const result = await whatsAppNotificationService.sendWelcomeMessage(resident);
        if (result.success) {
          toast.success('Welcome message sent');
        } else {
          toast.error(result.error || 'Failed to send message');
        }
        return result;
      } finally {
        setIsSending(false);
      }
    },
    []
  );

  // Broadcast message
  const broadcast = useCallback(
    async (residents: Resident[], templateName: string, parameters: any[]) => {
      setIsSending(true);
      try {
        const result = await whatsAppNotificationService.broadcast(
          residents,
          templateName,
          parameters
        );
        
        if (result.sent > 0) {
          toast.success(`Broadcast sent to ${result.sent} residents`);
        }
        
        if (result.failed > 0) {
          toast.error(`Failed to send to ${result.failed} residents`);
        }
        
        return result;
      } finally {
        setIsSending(false);
      }
    },
    []
  );

  return {
    isSending,
    sendAccessNotification,
    sendVisitorArrival,
    sendDeliveryNotification,
    sendEmergencyAlert,
    sendMaintenanceNotice,
    sendSecurityAlert,
    sendPinNotification,
    sendPaymentReminder,
    sendWelcomeMessage,
    broadcast
  };
}