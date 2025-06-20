'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Send, 
  Users, 
  Bell,
  AlertTriangle,
  Package,
  Wrench,
  Shield,
  Key,
  DollarSign,
  UserPlus,
  Megaphone,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { useWhatsAppNotification } from '@/hooks/useWhatsAppNotification';
import { useTranslations } from 'next-intl';
import { WHATSAPP_CONFIG } from '@/services/whatsapp/config';

export function NotificationCenter() {
  const t = useTranslations('WhatsApp.notifications');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedResidents, setSelectedResidents] = useState<string[]>([]);
  const [showBroadcastDialog, setShowBroadcastDialog] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  
  const {
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
  } = useWhatsAppNotification();

  const notificationTemplates = [
    {
      id: WHATSAPP_CONFIG.TEMPLATES.ACCESS_NOTIFICATION,
      name: t('templates.accessNotification'),
      icon: <UserPlus className="h-4 w-4" />,
      description: t('templates.accessNotificationDesc'),
      category: 'access'
    },
    {
      id: WHATSAPP_CONFIG.TEMPLATES.VISITOR_ARRIVAL,
      name: t('templates.visitorArrival'),
      icon: <Bell className="h-4 w-4" />,
      description: t('templates.visitorArrivalDesc'),
      category: 'access'
    },
    {
      id: WHATSAPP_CONFIG.TEMPLATES.DELIVERY_NOTIFICATION,
      name: t('templates.deliveryNotification'),
      icon: <Package className="h-4 w-4" />,
      description: t('templates.deliveryNotificationDesc'),
      category: 'delivery'
    },
    {
      id: WHATSAPP_CONFIG.TEMPLATES.EMERGENCY_ALERT,
      name: t('templates.emergencyAlert'),
      icon: <AlertTriangle className="h-4 w-4" />,
      description: t('templates.emergencyAlertDesc'),
      category: 'emergency'
    },
    {
      id: WHATSAPP_CONFIG.TEMPLATES.MAINTENANCE_NOTICE,
      name: t('templates.maintenanceNotice'),
      icon: <Wrench className="h-4 w-4" />,
      description: t('templates.maintenanceNoticeDesc'),
      category: 'maintenance'
    },
    {
      id: WHATSAPP_CONFIG.TEMPLATES.SECURITY_ALERT,
      name: t('templates.securityAlert'),
      icon: <Shield className="h-4 w-4" />,
      description: t('templates.securityAlertDesc'),
      category: 'security'
    },
    {
      id: WHATSAPP_CONFIG.TEMPLATES.PIN_NOTIFICATION,
      name: t('templates.pinNotification'),
      icon: <Key className="h-4 w-4" />,
      description: t('templates.pinNotificationDesc'),
      category: 'access'
    },
    {
      id: WHATSAPP_CONFIG.TEMPLATES.PAYMENT_REMINDER,
      name: t('templates.paymentReminder'),
      icon: <DollarSign className="h-4 w-4" />,
      description: t('templates.paymentReminderDesc'),
      category: 'billing'
    },
    {
      id: WHATSAPP_CONFIG.TEMPLATES.WELCOME_MESSAGE,
      name: t('templates.welcomeMessage'),
      icon: <UserPlus className="h-4 w-4" />,
      description: t('templates.welcomeMessageDesc'),
      category: 'onboarding'
    },
    {
      id: WHATSAPP_CONFIG.TEMPLATES.GENERAL_ANNOUNCEMENT,
      name: t('templates.generalAnnouncement'),
      icon: <Megaphone className="h-4 w-4" />,
      description: t('templates.generalAnnouncementDesc'),
      category: 'general'
    }
  ];

  const recentNotifications = [
    {
      id: '1',
      template: 'Notificación de acceso',
      recipients: 45,
      sentAt: new Date(Date.now() - 1000 * 60 * 30),
      status: 'completed'
    },
    {
      id: '2',
      template: 'Alerta de mantenimiento',
      recipients: 120,
      sentAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
      status: 'completed'
    },
    {
      id: '3',
      template: 'Recordatorio de pago',
      recipients: 15,
      sentAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
      status: 'failed'
    }
  ];

  const handleSendNotification = async () => {
    if (!selectedTemplate) return;

    // Handle different notification types based on template
    switch (selectedTemplate) {
      case WHATSAPP_CONFIG.TEMPLATES.EMERGENCY_ALERT:
        // For demo, send to a mock resident
        await sendEmergencyAlert(
          { id: '1', name: 'Demo', phone: '598999999999', apartment: '101', buildingId: '1' },
          'Alerta de incendio',
          'Edificio Torre Sur',
          'Evacuar inmediatamente por las escaleras'
        );
        break;
      // Add other cases as needed
    }
  };

  const handleBroadcast = async () => {
    if (!selectedTemplate || selectedResidents.length === 0) return;

    // Mock residents for demo
    const mockResidents = selectedResidents.map(id => ({
      id,
      name: `Resident ${id}`,
      phone: `59899999999${id}`,
      apartment: `10${id}`,
      buildingId: '1'
    }));

    await broadcast(mockResidents, selectedTemplate, []);
    setShowBroadcastDialog(false);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.sent')}</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">
              {t('stats.last30Days')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.delivered')}</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">98.5%</div>
            <p className="text-xs text-muted-foreground">
              {t('stats.deliveryRate')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.scheduled')}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">
              {t('stats.pendingNotifications')}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">{t('tabs.templates')}</TabsTrigger>
          <TabsTrigger value="recent">{t('tabs.recent')}</TabsTrigger>
          <TabsTrigger value="scheduled">{t('tabs.scheduled')}</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('sendNotification')}</CardTitle>
                <Button
                  onClick={() => setShowBroadcastDialog(true)}
                  disabled={!selectedTemplate || isSending}
                >
                  <Megaphone className="mr-2 h-4 w-4" />
                  {t('broadcast')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {notificationTemplates.map((template) => (
                  <div
                    key={template.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedTemplate === template.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        {template.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{template.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {template.description}
                        </p>
                        <Badge variant="secondary" className="mt-2">
                          {template.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedTemplate && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t('templateSelected')}</AlertTitle>
                  <AlertDescription>
                    {t('configureAndSend')}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>{t('recentNotifications')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div>
                      <h4 className="font-medium">{notification.template}</h4>
                      <p className="text-sm text-muted-foreground">
                        {t('sentTo', { count: notification.recipients })} •{' '}
                        {new Date(notification.sentAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge
                      variant={notification.status === 'completed' ? 'success' : 'destructive'}
                    >
                      {notification.status === 'completed' ? t('completed') : t('failed')}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled">
          <Card>
            <CardHeader>
              <CardTitle>{t('scheduledNotifications')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4" />
                <p>{t('noScheduled')}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Broadcast Dialog */}
      <Dialog open={showBroadcastDialog} onOpenChange={setShowBroadcastDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('broadcastMessage')}</DialogTitle>
            <DialogDescription>
              {t('broadcastDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('selectResidents')}</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectBuilding')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allResidents')}</SelectItem>
                  <SelectItem value="building1">Torre Norte</SelectItem>
                  <SelectItem value="building2">Torre Sur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('message')}</Label>
              <Textarea
                placeholder={t('messagePlaceholder')}
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBroadcastDialog(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleBroadcast} disabled={isSending}>
              <Send className="mr-2 h-4 w-4" />
              {t('sendBroadcast')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}