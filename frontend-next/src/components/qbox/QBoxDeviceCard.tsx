'use client';

import { useState } from 'react';
import { QBoxDevice } from '@/services/qbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  MoreVertical, 
  DoorOpen, 
  Camera, 
  Volume2, 
  RefreshCw,
  Settings,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useQBoxDevice } from '@/hooks/useQBoxDevice';
import { useTranslations } from 'next-intl';

interface QBoxDeviceCardProps {
  device: QBoxDevice;
  onUpdate?: () => void;
}

export function QBoxDeviceCard({ device, onUpdate }: QBoxDeviceCardProps) {
  const t = useTranslations('QBox');
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  
  const {
    openDoor,
    restartDevice,
    takeSnapshot,
    displayMessage,
    playSound,
    getDeviceLogs,
    isSendingCommand
  } = useQBoxDevice({ deviceId: device.id });

  const handleOpenDoor = async () => {
    await openDoor(device.id);
    onUpdate?.();
  };

  const handleSnapshot = async () => {
    const imageUrl = await takeSnapshot(device.id);
    if (imageUrl) {
      window.open(imageUrl, '_blank');
    }
  };

  const handlePlaySound = async () => {
    await playSound(device.id, 'notification.mp3');
  };

  const handleRestart = async () => {
    if (confirm(t('confirmRestart'))) {
      await restartDevice(device.id);
      onUpdate?.();
    }
  };

  const handleViewLogs = async () => {
    setShowLogs(true);
    setLoadingLogs(true);
    try {
      const deviceLogs = await getDeviceLogs(device.id, 50);
      setLogs(deviceLogs);
    } finally {
      setLoadingLogs(false);
    }
  };

  const getStatusColor = (status: QBoxDevice['status']) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-gray-500';
      case 'maintenance': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadge = (status: QBoxDevice['status']) => {
    switch (status) {
      case 'online': return <Badge variant="success">{t('status.online')}</Badge>;
      case 'offline': return <Badge variant="secondary">{t('status.offline')}</Badge>;
      case 'maintenance': return <Badge variant="warning">{t('status.maintenance')}</Badge>;
      case 'error': return <Badge variant="destructive">{t('status.error')}</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-medium">
            {device.location}
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleOpenDoor}>
                <DoorOpen className="mr-2 h-4 w-4" />
                {t('openDoor')}
              </DropdownMenuItem>
              {device.features.camera && (
                <DropdownMenuItem onClick={handleSnapshot}>
                  <Camera className="mr-2 h-4 w-4" />
                  {t('takeSnapshot')}
                </DropdownMenuItem>
              )}
              {device.features.audio && (
                <DropdownMenuItem onClick={handlePlaySound}>
                  <Volume2 className="mr-2 h-4 w-4" />
                  {t('playSound')}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleViewLogs}>
                <FileText className="mr-2 h-4 w-4" />
                {t('viewLogs')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleRestart}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('restart')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t('status.label')}</span>
              {getStatusBadge(device.status)}
            </div>

            {/* Device Info */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('model')}</span>
                <span>{device.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('firmware')}</span>
                <span>{device.firmwareVersion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('lastSeen')}</span>
                <span>
                  {formatDistanceToNow(new Date(device.lastSeen), {
                    addSuffix: true,
                    locale: es
                  })}
                </span>
              </div>
            </div>

            {/* Features */}
            <div className="flex flex-wrap gap-1">
              {device.features.camera && <Badge variant="outline">{t('features.camera')}</Badge>}
              {device.features.audio && <Badge variant="outline">{t('features.audio')}</Badge>}
              {device.features.pin && <Badge variant="outline">{t('features.pin')}</Badge>}
              {device.features.card && <Badge variant="outline">{t('features.card')}</Badge>}
              {device.features.qr && <Badge variant="outline">{t('features.qr')}</Badge>}
              {device.features.facial && <Badge variant="outline">{t('features.facial')}</Badge>}
            </div>

            {/* Stats */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('stats.totalAccess')}</span>
                <span>{device.stats.totalAccess.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('stats.failedAttempts')}</span>
                <span className={device.stats.failedAttempts > 10 ? 'text-red-600' : ''}>
                  {device.stats.failedAttempts}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('stats.uptime')}</span>
                <span>{Math.round(device.stats.uptime / 3600)}h</span>
              </div>
            </div>

            {/* Health indicator */}
            {device.status === 'online' && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('health')}</span>
                  <span>
                    {device.stats.failedAttempts === 0 ? t('health.excellent') :
                     device.stats.failedAttempts < 5 ? t('health.good') :
                     device.stats.failedAttempts < 10 ? t('health.fair') :
                     t('health.poor')}
                  </span>
                </div>
                <Progress 
                  value={Math.max(0, 100 - (device.stats.failedAttempts * 5))} 
                  className="h-2"
                />
              </div>
            )}

            {/* Warning for errors */}
            {device.status === 'error' && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertTriangle className="h-4 w-4" />
                <span>{t('errorMessage')}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Logs Dialog */}
      <Dialog open={showLogs} onOpenChange={setShowLogs}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('deviceLogs')} - {device.location}</DialogTitle>
            <DialogDescription>
              {t('logsDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {loadingLogs ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('noLogs')}
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log, index) => (
                  <div key={index} className="p-2 rounded border text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">{log.event}</span>
                      <span className="text-muted-foreground text-xs">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {log.message && (
                      <p className="text-muted-foreground mt-1">{log.message}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}