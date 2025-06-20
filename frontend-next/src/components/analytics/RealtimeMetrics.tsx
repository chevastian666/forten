'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity,
  Users,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface RealtimeMetricsProps {
  updates: {
    newAccess?: number;
    newAlerts?: number;
    maintenanceCompleted?: number;
    paymentReceived?: number;
  };
}

interface MetricUpdate {
  id: string;
  type: 'access' | 'alert' | 'maintenance' | 'payment';
  value: number;
  timestamp: Date;
}

export function RealtimeMetrics({ updates }: RealtimeMetricsProps) {
  const [recentUpdates, setRecentUpdates] = useState<MetricUpdate[]>([]);
  const [animatingMetrics, setAnimatingMetrics] = useState<Set<string>>(new Set());

  useEffect(() => {
    const newUpdates: MetricUpdate[] = [];
    const timestamp = new Date();

    if (updates.newAccess) {
      newUpdates.push({
        id: `access-${timestamp.getTime()}`,
        type: 'access',
        value: updates.newAccess,
        timestamp
      });
    }

    if (updates.newAlerts) {
      newUpdates.push({
        id: `alert-${timestamp.getTime()}`,
        type: 'alert',
        value: updates.newAlerts,
        timestamp
      });
    }

    if (updates.maintenanceCompleted) {
      newUpdates.push({
        id: `maintenance-${timestamp.getTime()}`,
        type: 'maintenance',
        value: updates.maintenanceCompleted,
        timestamp
      });
    }

    if (updates.paymentReceived) {
      newUpdates.push({
        id: `payment-${timestamp.getTime()}`,
        type: 'payment',
        value: updates.paymentReceived,
        timestamp
      });
    }

    if (newUpdates.length > 0) {
      setRecentUpdates(prev => [...newUpdates, ...prev].slice(0, 10));
      
      // Trigger animations
      newUpdates.forEach(update => {
        setAnimatingMetrics(prev => new Set(prev).add(update.type));
        setTimeout(() => {
          setAnimatingMetrics(prev => {
            const next = new Set(prev);
            next.delete(update.type);
            return next;
          });
        }, 2000);
      });
    }
  }, [updates]);

  const getUpdateInfo = (update: MetricUpdate) => {
    switch (update.type) {
      case 'access':
        return {
          icon: <Users className="h-4 w-4" />,
          label: 'Nuevos accesos',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100 dark:bg-blue-900',
          value: `+${update.value}`
        };
      case 'alert':
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          label: 'Nuevas alertas',
          color: 'text-red-600',
          bgColor: 'bg-red-100 dark:bg-red-900',
          value: `+${update.value}`
        };
      case 'maintenance':
        return {
          icon: <CheckCircle2 className="h-4 w-4" />,
          label: 'Mantenimiento completado',
          color: 'text-green-600',
          bgColor: 'bg-green-100 dark:bg-green-900',
          value: `${update.value}`
        };
      case 'payment':
        return {
          icon: <DollarSign className="h-4 w-4" />,
          label: 'Pago recibido',
          color: 'text-green-600',
          bgColor: 'bg-green-100 dark:bg-green-900',
          value: `$${update.value.toLocaleString('es-UY')}`
        };
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const seconds = Math.floor((new Date().getTime() - timestamp.getTime()) / 1000);
    
    if (seconds < 60) {
      return 'hace unos segundos';
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return `hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
    } else {
      const hours = Math.floor(seconds / 3600);
      return `hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    }
  };

  return (
    <div className="space-y-4">
      {/* Real-time Indicators */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className={cn(
          "transition-all duration-300",
          animatingMetrics.has('access') && "ring-2 ring-blue-500 ring-opacity-50"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Accesos</p>
                  <p className="text-xs text-muted-foreground">En tiempo real</p>
                </div>
              </div>
              {animatingMetrics.has('access') && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="flex items-center gap-1 text-blue-600"
                >
                  <ArrowUp className="h-4 w-4" />
                  <span className="text-sm font-bold">+{updates.newAccess}</span>
                </motion.div>
              )}
            </div>
            <div className="mt-2">
              <Activity className="h-12 w-full text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "transition-all duration-300",
          animatingMetrics.has('alert') && "ring-2 ring-red-500 ring-opacity-50"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Alertas</p>
                  <p className="text-xs text-muted-foreground">Activas ahora</p>
                </div>
              </div>
              {animatingMetrics.has('alert') && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="flex items-center gap-1 text-red-600"
                >
                  <ArrowUp className="h-4 w-4" />
                  <span className="text-sm font-bold">+{updates.newAlerts}</span>
                </motion.div>
              )}
            </div>
            <Progress value={75} className="mt-4 h-1" />
          </CardContent>
        </Card>

        <Card className={cn(
          "transition-all duration-300",
          animatingMetrics.has('maintenance') && "ring-2 ring-green-500 ring-opacity-50"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Mantenimiento</p>
                  <p className="text-xs text-muted-foreground">Completado hoy</p>
                </div>
              </div>
              {animatingMetrics.has('maintenance') && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="flex items-center gap-1 text-green-600"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-bold">{updates.maintenanceCompleted}</span>
                </motion.div>
              )}
            </div>
            <Progress value={85} className="mt-4 h-1" />
          </CardContent>
        </Card>

        <Card className={cn(
          "transition-all duration-300",
          animatingMetrics.has('payment') && "ring-2 ring-green-500 ring-opacity-50"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <DollarSign className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Pagos</p>
                  <p className="text-xs text-muted-foreground">Recibidos hoy</p>
                </div>
              </div>
              {animatingMetrics.has('payment') && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="flex items-center gap-1 text-green-600"
                >
                  <ArrowUp className="h-4 w-4" />
                  <span className="text-sm font-bold">${updates.paymentReceived}</span>
                </motion.div>
              )}
            </div>
            <Progress value={92} className="mt-4 h-1" />
          </CardContent>
        </Card>
      </div>

      {/* Recent Updates Feed */}
      {recentUpdates.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-medium mb-3">Actualizaciones Recientes</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              <AnimatePresence>
                {recentUpdates.map((update) => {
                  const info = getUpdateInfo(update);
                  return (
                    <motion.div
                      key={update.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("p-1.5 rounded", info.bgColor)}>
                          <div className={info.color}>{info.icon}</div>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{info.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatTimeAgo(update.timestamp)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className={info.color}>
                        {info.value}
                      </Badge>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}