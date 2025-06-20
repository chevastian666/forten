'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Users, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  UserCheck,
  UserX,
  Wifi,
  WifiOff
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useQBoxResident } from '@/hooks/useQBoxResident';
import { useTranslations } from 'next-intl';
import { QBoxResident } from '@/services/qbox';

interface QBoxResidentSyncProps {
  buildingId: string;
}

export function QBoxResidentSync({ buildingId }: QBoxResidentSyncProps) {
  const t = useTranslations('QBox.residents');
  const [selectedResidents, setSelectedResidents] = useState<Set<string>>(new Set());
  
  const {
    residents,
    syncedResidents,
    pendingResidents,
    errorResidents,
    syncStatus,
    syncProgress,
    syncPercentage,
    isLoading,
    isSyncing,
    syncBuilding,
    updateResident,
    removeResident,
    refetch
  } = useQBoxResident({ 
    buildingId,
    onSyncProgress: (progress) => {
      console.log('Sync progress:', progress);
    }
  });

  const handleSyncBuilding = () => {
    if (confirm(t('confirmSync'))) {
      syncBuilding(buildingId);
    }
  };

  const handleToggleResident = (residentId: string) => {
    const newSelected = new Set(selectedResidents);
    if (newSelected.has(residentId)) {
      newSelected.delete(residentId);
    } else {
      newSelected.add(residentId);
    }
    setSelectedResidents(newSelected);
  };

  const handleRemoveResident = (resident: QBoxResident) => {
    if (confirm(t('confirmRemove', { name: `${resident.firstName} ${resident.lastName}` }))) {
      removeResident(resident.id);
    }
  };

  const getSyncStatusBadge = (status: QBoxResident['syncStatus']) => {
    switch (status) {
      case 'synced':
        return <Badge variant="success">{t('status.synced')}</Badge>;
      case 'pending':
        return <Badge variant="secondary">{t('status.pending')}</Badge>;
      case 'error':
        return <Badge variant="destructive">{t('status.error')}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getResidentStatusIcon = (resident: QBoxResident) => {
    if (resident.syncStatus === 'synced') {
      return <Wifi className="h-4 w-4 text-green-500" />;
    } else if (resident.syncStatus === 'error') {
      return <WifiOff className="h-4 w-4 text-red-500" />;
    }
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.total')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{residents.length}</div>
            <Progress value={syncPercentage} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.synced')}</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{syncedResidents.length}</div>
            <p className="text-xs text-muted-foreground">
              {syncPercentage}% {t('complete')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.pending')}</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingResidents.length}</div>
            <p className="text-xs text-muted-foreground">
              {t('waitingSync')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.errors')}</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{errorResidents.length}</div>
            <p className="text-xs text-muted-foreground">
              {t('syncErrors')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sync Status */}
      {syncStatus && (
        <Card>
          <CardHeader>
            <CardTitle>{t('syncStatus')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">{t('lastSync')}</span>
                <span className="text-sm text-muted-foreground">
                  {syncStatus.lastSync
                    ? formatDistanceToNow(new Date(syncStatus.lastSync), {
                        addSuffix: true,
                        locale: es
                      })
                    : t('never')}
                </span>
              </div>
              <Separator />
              <Button
                onClick={handleSyncBuilding}
                disabled={isSyncing || residents.length === 0}
                className="w-full"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    {t('syncing')}
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t('syncNow')}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sync Progress */}
      {syncProgress && isSyncing && (
        <Alert>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <AlertTitle>{t('syncInProgress')}</AlertTitle>
          <AlertDescription>
            <div className="space-y-2 mt-2">
              <div className="flex justify-between text-sm">
                <span>{syncProgress.currentResident || t('preparing')}</span>
                <span>{syncProgress.current}/{syncProgress.total}</span>
              </div>
              <Progress value={syncProgress.percentage} />
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Error Residents Alert */}
      {errorResidents.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('syncErrorsDetected')}</AlertTitle>
          <AlertDescription>
            {t('errorDescription', { count: errorResidents.length })}
          </AlertDescription>
        </Alert>
      )}

      {/* Residents Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('residentsList')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>{t('name')}</TableHead>
                <TableHead>{t('apartment')}</TableHead>
                <TableHead>{t('accessMethods')}</TableHead>
                <TableHead>{t('syncStatus')}</TableHead>
                <TableHead>{t('lastSync')}</TableHead>
                <TableHead>{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {residents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    {t('noResidents')}
                  </TableCell>
                </TableRow>
              ) : (
                residents.map((resident) => (
                  <TableRow key={resident.id}>
                    <TableCell>
                      {getResidentStatusIcon(resident)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {resident.firstName} {resident.lastName}
                    </TableCell>
                    <TableCell>{resident.apartment}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {resident.accessMethods.map(method => (
                          <Badge key={method} variant="outline" className="text-xs">
                            {t(`accessMethod.${method}`)}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{getSyncStatusBadge(resident.syncStatus)}</TableCell>
                    <TableCell>
                      {resident.lastSync
                        ? formatDistanceToNow(new Date(resident.lastSync), {
                            addSuffix: true,
                            locale: es
                          })
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {resident.status === 'active' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateResident({
                            residentId: resident.id,
                            updates: { status: 'suspended' }
                          })}
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateResident({
                            residentId: resident.id,
                            updates: { status: 'active' }
                          })}
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}