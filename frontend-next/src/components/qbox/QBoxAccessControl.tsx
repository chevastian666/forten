'use client';

import { useState } from 'react';
import { AccessPermission, AccessLog } from '@/services/qbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Shield, 
  ShieldCheck, 
  ShieldX,
  UserPlus,
  DoorOpen,
  AlertTriangle,
  Clock,
  TrendingUp
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useQBoxAccess } from '@/hooks/useQBoxAccess';
import { useTranslations } from 'next-intl';

interface QBoxAccessControlProps {
  buildingId: string;
}

export function QBoxAccessControl({ buildingId }: QBoxAccessControlProps) {
  const t = useTranslations('QBox.access');
  const [selectedLog, setSelectedLog] = useState<AccessLog | null>(null);
  
  const {
    permissions,
    activePermissions,
    logs,
    recentLogs,
    grantedLogs,
    deniedLogs,
    stats,
    accessRate,
    isLoading,
    requestRemoteAccess,
    emergencyAccess,
    isRequestingRemote,
    isEmergency
  } = useQBoxAccess({ buildingId, autoRefresh: true });

  const handleEmergencyAccess = () => {
    const reason = prompt(t('emergencyReason'));
    if (reason) {
      emergencyAccess({ buildingId, reason });
    }
  };

  const getMethodBadge = (method: string) => {
    const colors: Record<string, string> = {
      pin: 'bg-blue-500',
      card: 'bg-green-500',
      qr: 'bg-purple-500',
      facial: 'bg-orange-500',
      remote: 'bg-yellow-500',
      manual: 'bg-gray-500'
    };
    
    return (
      <Badge 
        variant="outline" 
        className={`${colors[method] || 'bg-gray-500'} text-white border-0`}
      >
        {t(`method.${method}`)}
      </Badge>
    );
  };

  const renderAccessLog = (log: AccessLog) => (
    <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50">
      <TableCell>
        {format(new Date(log.timestamp), 'dd/MM HH:mm', { locale: es })}
      </TableCell>
      <TableCell>{log.userName || log.userId || '-'}</TableCell>
      <TableCell>{log.deviceName}</TableCell>
      <TableCell>{getMethodBadge(log.method)}</TableCell>
      <TableCell>
        {log.granted ? (
          <Badge variant="success">{t('granted')}</Badge>
        ) : (
          <Badge variant="destructive">{t('denied')}</Badge>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {log.reason || '-'}
      </TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.totalAccess')}</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length}</div>
            <p className="text-xs text-muted-foreground">
              {t('stats.last7Days')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.accessRate')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accessRate}%</div>
            <Progress value={accessRate} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.activePermissions')}</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activePermissions.length}</div>
            <p className="text-xs text-muted-foreground">
              {t('stats.totalPermissions', { total: permissions.length })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.deniedAccess')}</CardTitle>
            <ShieldX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{deniedLogs.length}</div>
            <p className="text-xs text-muted-foreground">
              {t('stats.last7Days')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Emergency Access */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-5 w-5" />
            {t('emergencyAccess')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-700 mb-4">
            {t('emergencyDescription')}
          </p>
          <Button
            variant="destructive"
            onClick={handleEmergencyAccess}
            disabled={isEmergency}
          >
            <DoorOpen className="mr-2 h-4 w-4" />
            {t('activateEmergency')}
          </Button>
        </CardContent>
      </Card>

      {/* Access Logs */}
      <Card>
        <CardHeader>
          <CardTitle>{t('accessLogs')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="recent" className="space-y-4">
            <TabsList>
              <TabsTrigger value="recent">{t('tabs.recent')}</TabsTrigger>
              <TabsTrigger value="granted">
                {t('tabs.granted')} ({grantedLogs.length})
              </TabsTrigger>
              <TabsTrigger value="denied">
                {t('tabs.denied')} ({deniedLogs.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="recent">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('time')}</TableHead>
                    <TableHead>{t('user')}</TableHead>
                    <TableHead>{t('device')}</TableHead>
                    <TableHead>{t('method')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead>{t('reason')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        {t('noLogs')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentLogs.map(renderAccessLog)
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="granted">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('time')}</TableHead>
                    <TableHead>{t('user')}</TableHead>
                    <TableHead>{t('device')}</TableHead>
                    <TableHead>{t('method')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead>{t('reason')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grantedLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        {t('noLogs')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    grantedLogs.map(renderAccessLog)
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="denied">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('time')}</TableHead>
                    <TableHead>{t('user')}</TableHead>
                    <TableHead>{t('device')}</TableHead>
                    <TableHead>{t('method')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead>{t('reason')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deniedLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        {t('noLogs')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    deniedLogs.map(renderAccessLog)
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Access Statistics by Hour */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>{t('stats.byHour')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats.byHour).map(([hour, count]) => (
                <div key={hour} className="flex items-center gap-2">
                  <span className="text-sm font-medium w-12">{hour}:00</span>
                  <Progress 
                    value={(count / Math.max(...Object.values(stats.byHour))) * 100} 
                    className="flex-1 h-4"
                  />
                  <span className="text-sm text-muted-foreground w-12 text-right">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}