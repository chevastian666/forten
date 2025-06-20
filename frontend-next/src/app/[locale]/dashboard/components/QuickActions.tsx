"use client";

import { useState } from 'react';
import { api } from '@/lib/api';
import { useNotifications } from '@/contexts/NotificationContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Hash, Megaphone, Lock, Camera, RefreshCw, Save } from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline';
  action: () => void;
}

export function QuickActions() {
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { addNotification } = useNotifications();

  const [pinForm, setPinForm] = useState({
    visitorName: '',
    apartment: '',
    duration: '4'
  });

  const [alertForm, setAlertForm] = useState({
    type: 'security',
    title: '',
    message: ''
  });

  const handleGeneratePin = async () => {
    setLoading(true);
    try {
      const response = await api.post('/access/generate-pin', {
        visitorName: pinForm.visitorName,
        apartment: pinForm.apartment,
        duration: parseInt(pinForm.duration),
        type: 'temporary'
      });

      addNotification({
        type: 'success',
        title: 'PIN Generado',
        message: `PIN ${response.data.pin} creado para ${pinForm.visitorName}`
      });

      setPinDialogOpen(false);
      setPinForm({ visitorName: '', apartment: '', duration: '4' });
    } catch {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'No se pudo generar el PIN'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendAlert = async () => {
    setLoading(true);
    try {
      await api.post('/notifications/broadcast', {
        type: alertForm.type,
        title: alertForm.title,
        message: alertForm.message,
        priority: 'high'
      });

      addNotification({
        type: 'success',
        title: 'Alerta Enviada',
        message: 'Notificación enviada a todos los residentes'
      });

      setAlertDialogOpen(false);
      setAlertForm({ type: 'security', title: '', message: '' });
    } catch {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'No se pudo enviar la alerta'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLockdownToggle = async () => {
    setLoading(true);
    try {
      await api.post('/building/lockdown/toggle');
      
      addNotification({
        type: 'warning',
        title: 'Modo Seguridad',
        message: 'Estado de bloqueo del edificio actualizado'
      });
    } catch {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'No se pudo cambiar el estado de seguridad'
      });
    } finally {
      setLoading(false);
    }
  };

  const actions: QuickAction[] = [
    {
      id: 'generate-pin',
      label: 'Generar PIN Temporal',
      icon: <Hash className="h-4 w-4" />,
      variant: 'default',
      action: () => setPinDialogOpen(true)
    },
    {
      id: 'emergency-alert',
      label: 'Enviar Alerta General',
      icon: <Megaphone className="h-4 w-4" />,
      variant: 'outline',
      action: () => setAlertDialogOpen(true)
    },
    {
      id: 'lockdown',
      label: 'Modo Seguridad',
      icon: <Lock className="h-4 w-4" />,
      variant: 'destructive',
      action: handleLockdownToggle
    },
    {
      id: 'camera-check',
      label: 'Verificar Cámaras',
      icon: <Camera className="h-4 w-4" />,
      action: async () => {
        setLoading(true);
        try {
          await api.post('/cameras/health-check');
          addNotification({
            type: 'success',
            title: 'Verificación Completa',
            message: 'Estado de cámaras actualizado'
          });
        } catch {
          addNotification({
            type: 'error',
            title: 'Error',
            message: 'No se pudo verificar las cámaras'
          });
        } finally {
          setLoading(false);
        }
      }
    },
    {
      id: 'sync-data',
      label: 'Sincronizar Datos',
      icon: <RefreshCw className="h-4 w-4" />,
      action: async () => {
        setLoading(true);
        try {
          await api.post('/system/sync');
          addNotification({
            type: 'success',
            title: 'Sincronización Completa',
            message: 'Datos actualizados correctamente'
          });
        } catch {
          addNotification({
            type: 'error',
            title: 'Error',
            message: 'Error en la sincronización'
          });
        } finally {
          setLoading(false);
        }
      }
    },
    {
      id: 'backup',
      label: 'Respaldar Sistema',
      icon: <Save className="h-4 w-4" />,
      action: async () => {
        setLoading(true);
        try {
          await api.post('/system/backup');
          addNotification({
            type: 'success',
            title: 'Respaldo Creado',
            message: 'Sistema respaldado exitosamente'
          });
        } catch {
          addNotification({
            type: 'error',
            title: 'Error',
            message: 'No se pudo crear el respaldo'
          });
        } finally {
          setLoading(false);
        }
      }
    }
  ];

  return (
    <>
      <Card className="p-6">
        <div className="grid gap-3">
          {actions.map(action => (
            <Button
              key={action.id}
              variant={action.variant || 'outline'}
              onClick={action.action}
              disabled={loading}
              className="justify-start gap-2 h-auto py-3"
            >
              {action.icon}
              {action.label}
            </Button>
          ))}
        </div>
      </Card>

      {/* PIN Generation Dialog */}
      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generar PIN Temporal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="visitorName">Nombre del Visitante</Label>
              <Input
                id="visitorName"
                value={pinForm.visitorName}
                onChange={(e) => setPinForm({ ...pinForm, visitorName: e.target.value })}
                placeholder="Ej: Juan Pérez"
              />
            </div>
            <div>
              <Label htmlFor="apartment">Apartamento</Label>
              <Input
                id="apartment"
                value={pinForm.apartment}
                onChange={(e) => setPinForm({ ...pinForm, apartment: e.target.value })}
                placeholder="Ej: Apto 501"
              />
            </div>
            <div>
              <Label htmlFor="duration">Duración</Label>
              <Select 
                value={pinForm.duration} 
                onValueChange={(value) => setPinForm({ ...pinForm, duration: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hora</SelectItem>
                  <SelectItem value="2">2 horas</SelectItem>
                  <SelectItem value="4">4 horas</SelectItem>
                  <SelectItem value="8">8 horas</SelectItem>
                  <SelectItem value="24">24 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleGeneratePin}
                disabled={loading || !pinForm.visitorName || !pinForm.apartment}
                className="flex-1"
              >
                Generar PIN
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setPinDialogOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog */}
      <Dialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Alerta General</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="alertType">Tipo de Alerta</Label>
              <Select 
                value={alertForm.type} 
                onValueChange={(value) => setAlertForm({ ...alertForm, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="security">Seguridad</SelectItem>
                  <SelectItem value="maintenance">Mantenimiento</SelectItem>
                  <SelectItem value="emergency">Emergencia</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="alertTitle">Título</Label>
              <Input
                id="alertTitle"
                value={alertForm.title}
                onChange={(e) => setAlertForm({ ...alertForm, title: e.target.value })}
                placeholder="Ej: Corte de agua programado"
              />
            </div>
            <div>
              <Label htmlFor="alertMessage">Mensaje</Label>
              <Input
                id="alertMessage"
                value={alertForm.message}
                onChange={(e) => setAlertForm({ ...alertForm, message: e.target.value })}
                placeholder="Detalle de la alerta..."
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSendAlert}
                disabled={loading || !alertForm.title || !alertForm.message}
                className="flex-1"
              >
                Enviar Alerta
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setAlertDialogOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}