'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Router, 
  Key, 
  Shield, 
  Users,
  Wifi,
  WifiOff,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useQBoxDevice } from '@/hooks/useQBoxDevice';
import { useQBoxMqtt } from '@/hooks/useQBoxMqtt';
import { useTranslations } from 'next-intl';
import { QBoxDeviceCard } from './QBoxDeviceCard';
import { QBoxPinManager } from './QBoxPinManager';
import { QBoxAccessControl } from './QBoxAccessControl';
import { QBoxResidentSync } from './QBoxResidentSync';

interface QBoxDashboardProps {
  buildingId: string;
}

export function QBoxDashboard({ buildingId }: QBoxDashboardProps) {
  const t = useTranslations('QBox');
  const [lastEvent, setLastEvent] = useState<any>(null);
  
  const {
    devices,
    isLoading,
    error,
    connectionStatus,
    isInitialized
  } = useQBoxDevice({ buildingId, autoRefresh: true });

  const {
    connectionStatus: mqttStatus,
    isConnected: mqttConnected,
    reconnectAttempts
  } = useQBoxMqtt({
    onDeviceEvent: (event) => {
      console.log('Device event:', event);
      setLastEvent(event);
    },
    onAccessGranted: (event) => {
      console.log('Access granted:', event);
    },
    onAccessDenied: (event) => {
      console.log('Access denied:', event);
    }
  });

  const onlineDevices = devices.filter(d => d.status === 'online');
  const offlineDevices = devices.filter(d => d.status === 'offline');
  const errorDevices = devices.filter(d => d.status === 'error');

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">{t('initializing')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {mqttConnected ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500" />
            )}
            <span className="text-sm">
              {mqttConnected ? t('connected') : t('disconnected')}
            </span>
          </div>
          {reconnectAttempts > 0 && (
            <Badge variant="secondary">
              {t('reconnectAttempts', { count: reconnectAttempts })}
            </Badge>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* Device Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalDevices')}</CardTitle>
            <Router className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{devices.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('onlineDevices')}</CardTitle>
            <Wifi className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{onlineDevices.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('offlineDevices')}</CardTitle>
            <WifiOff className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{offlineDevices.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('errorDevices')}</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{errorDevices.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="devices" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="devices" className="flex items-center gap-2">
            <Router className="h-4 w-4" />
            {t('tabs.devices')}
          </TabsTrigger>
          <TabsTrigger value="pins" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            {t('tabs.pins')}
          </TabsTrigger>
          <TabsTrigger value="access" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {t('tabs.access')}
          </TabsTrigger>
          <TabsTrigger value="residents" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t('tabs.residents')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="devices" className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : devices.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Router className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  {t('noDevices')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {devices.map((device) => (
                <QBoxDeviceCard key={device.id} device={device} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pins">
          <QBoxPinManager buildingId={buildingId} />
        </TabsContent>

        <TabsContent value="access">
          <QBoxAccessControl buildingId={buildingId} />
        </TabsContent>

        <TabsContent value="residents">
          <QBoxResidentSync buildingId={buildingId} />
        </TabsContent>
      </Tabs>

      {/* Last Event */}
      {lastEvent && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('lastEvent')}</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(lastEvent, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}