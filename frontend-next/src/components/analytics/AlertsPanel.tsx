'use client';

import { useState } from 'react';
import { AnalyticsAlert, AlertCondition } from '@/services/analytics/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertCircle,
  Bell,
  BellOff,
  Plus,
  Settings,
  Trash2,
  TrendingUp,
  TrendingDown,
  Equal,
  RefreshCw,
  Mail,
  MessageSquare,
  Webhook,
  Smartphone
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface AlertsPanelProps {
  alerts: AnalyticsAlert[];
  onCreateAlert: (alert: Omit<AnalyticsAlert, 'id' | 'lastTriggered' | 'triggerCount'>) => void;
  isCreating: boolean;
}

export function AlertsPanel({ alerts, onCreateAlert, isCreating }: AlertsPanelProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<AnalyticsAlert | null>(null);
  const [newAlert, setNewAlert] = useState({
    name: '',
    description: '',
    metric: '',
    condition: {
      type: 'above' as AlertCondition['type'],
      timeWindow: 5,
      aggregation: 'avg' as AlertCondition['aggregation']
    },
    threshold: 0,
    actions: [{
      type: 'notification' as const,
      recipients: [],
      template: ''
    }],
    enabled: true
  });

  const metrics = [
    { id: 'access_rate', name: 'Tasa de accesos', unit: 'accesos/hora' },
    { id: 'alert_count', name: 'Cantidad de alertas', unit: 'alertas' },
    { id: 'response_time', name: 'Tiempo de respuesta', unit: 'minutos' },
    { id: 'collection_rate', name: 'Tasa de cobro', unit: '%' },
    { id: 'satisfaction_score', name: 'Satisfacción', unit: 'puntos' },
    { id: 'pending_maintenance', name: 'Mantenimientos pendientes', unit: 'solicitudes' }
  ];

  const getConditionIcon = (type: AlertCondition['type']) => {
    switch (type) {
      case 'above':
        return <TrendingUp className="h-4 w-4" />;
      case 'below':
        return <TrendingDown className="h-4 w-4" />;
      case 'equals':
        return <Equal className="h-4 w-4" />;
      case 'change':
        return <RefreshCw className="h-4 w-4" />;
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'sms':
        return <Smartphone className="h-4 w-4" />;
      case 'whatsapp':
        return <MessageSquare className="h-4 w-4" />;
      case 'webhook':
        return <Webhook className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const handleCreateAlert = () => {
    if (!newAlert.name || !newAlert.metric || newAlert.threshold === 0) return;

    onCreateAlert({
      name: newAlert.name,
      description: newAlert.description,
      metric: newAlert.metric,
      condition: newAlert.condition,
      threshold: newAlert.threshold,
      actions: newAlert.actions,
      enabled: newAlert.enabled
    });

    setShowCreateDialog(false);
    resetNewAlert();
  };

  const resetNewAlert = () => {
    setNewAlert({
      name: '',
      description: '',
      metric: '',
      condition: {
        type: 'above',
        timeWindow: 5,
        aggregation: 'avg'
      },
      threshold: 0,
      actions: [{
        type: 'notification',
        recipients: [],
        template: ''
      }],
      enabled: true
    });
  };

  const activeAlerts = alerts.filter(a => a.enabled);
  const inactiveAlerts = alerts.filter(a => !a.enabled);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Alertas Configuradas</h3>
          <p className="text-sm text-muted-foreground">
            Gestiona las alertas basadas en métricas del sistema
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Alerta
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Activas</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAlerts.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disparadas Hoy</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {alerts.filter(a => 
                a.lastTriggered && 
                new Date(a.lastTriggered).toDateString() === new Date().toDateString()
              ).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Disparos</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {alerts.reduce((sum, a) => sum + a.triggerCount, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Alertas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Métrica</TableHead>
                <TableHead>Condición</TableHead>
                <TableHead>Última Activación</TableHead>
                <TableHead>Disparos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No hay alertas configuradas
                  </TableCell>
                </TableRow>
              ) : (
                alerts.map((alert) => {
                  const metric = metrics.find(m => m.id === alert.metric);
                  return (
                    <TableRow key={alert.id}>
                      <TableCell className="font-medium">{alert.name}</TableCell>
                      <TableCell>{metric?.name || alert.metric}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getConditionIcon(alert.condition.type)}
                          <span className="text-sm">
                            {alert.condition.type === 'above' && `> ${alert.threshold}`}
                            {alert.condition.type === 'below' && `< ${alert.threshold}`}
                            {alert.condition.type === 'equals' && `= ${alert.threshold}`}
                            {alert.condition.type === 'change' && `Δ ${alert.threshold}%`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {alert.lastTriggered ? (
                          <span className="text-sm">
                            {format(new Date(alert.lastTriggered), 'dd/MM HH:mm', { locale: es })}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Nunca</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{alert.triggerCount}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={alert.enabled ? 'success' : 'secondary'}
                          className="flex items-center gap-1 w-fit"
                        >
                          {alert.enabled ? (
                            <>
                              <Bell className="h-3 w-3" />
                              Activa
                            </>
                          ) : (
                            <>
                              <BellOff className="h-3 w-3" />
                              Inactiva
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedAlert(alert)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Alert Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crear Nueva Alerta</DialogTitle>
            <DialogDescription>
              Configura una nueva alerta basada en métricas del sistema
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={newAlert.name}
                onChange={(e) => setNewAlert({ ...newAlert, name: e.target.value })}
                placeholder="Ej: Alta tasa de accesos"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={newAlert.description}
                onChange={(e) => setNewAlert({ ...newAlert, description: e.target.value })}
                placeholder="Describe qué monitorea esta alerta"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="metric">Métrica</Label>
                <Select
                  value={newAlert.metric}
                  onValueChange={(value) => setNewAlert({ ...newAlert, metric: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una métrica" />
                  </SelectTrigger>
                  <SelectContent>
                    {metrics.map((metric) => (
                      <SelectItem key={metric.id} value={metric.id}>
                        {metric.name} ({metric.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="condition">Condición</Label>
                <Select
                  value={newAlert.condition.type}
                  onValueChange={(value) => 
                    setNewAlert({
                      ...newAlert,
                      condition: { ...newAlert.condition, type: value as AlertCondition['type'] }
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="above">Mayor que</SelectItem>
                    <SelectItem value="below">Menor que</SelectItem>
                    <SelectItem value="equals">Igual a</SelectItem>
                    <SelectItem value="change">Cambio porcentual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="threshold">Umbral</Label>
                <Input
                  id="threshold"
                  type="number"
                  value={newAlert.threshold}
                  onChange={(e) => setNewAlert({ ...newAlert, threshold: Number(e.target.value) })}
                  placeholder="0"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="timeWindow">Ventana de tiempo (minutos)</Label>
                <Input
                  id="timeWindow"
                  type="number"
                  value={newAlert.condition.timeWindow}
                  onChange={(e) => 
                    setNewAlert({
                      ...newAlert,
                      condition: { ...newAlert.condition, timeWindow: Number(e.target.value) }
                    })
                  }
                  placeholder="5"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Acciones</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Select
                    value={newAlert.actions[0]?.type}
                    onValueChange={(value) => 
                      setNewAlert({
                        ...newAlert,
                        actions: [{ ...newAlert.actions[0], type: value as any }]
                      })
                    }
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="notification">Notificación</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="webhook">Webhook</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Destinatarios (separados por coma)"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="enabled"
                checked={newAlert.enabled}
                onCheckedChange={(checked) => setNewAlert({ ...newAlert, enabled: checked })}
              />
              <Label htmlFor="enabled">Activar alerta inmediatamente</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateAlert} disabled={isCreating}>
              Crear Alerta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}