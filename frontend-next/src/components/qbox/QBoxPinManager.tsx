'use client';

import { useState } from 'react';
import { QBoxPin } from '@/services/qbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Plus, 
  Key, 
  Clock, 
  Users, 
  Trash2,
  Copy,
  RefreshCw,
  Download,
  Shield
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useQBoxPin } from '@/hooks/useQBoxPin';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

interface QBoxPinManagerProps {
  buildingId: string;
}

export function QBoxPinManager({ buildingId }: QBoxPinManagerProps) {
  const t = useTranslations('QBox.pins');
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedPin, setSelectedPin] = useState<QBoxPin | null>(null);
  const [pinType, setPinType] = useState<QBoxPin['type']>('temporary');
  const [description, setDescription] = useState('');
  const [validHours, setValidHours] = useState('24');
  const [maxUsage, setMaxUsage] = useState('');
  
  const {
    pins,
    activePins,
    expiredPins,
    permanentPins,
    temporaryPins,
    isLoading,
    generatePin,
    revokePin,
    cleanExpired,
    generateTemporaryPin,
    generateVisitorPin,
    isGenerating,
    isRevoking,
    isCleaning,
    refetch
  } = useQBoxPin({ buildingId, autoRefresh: true });

  const handleGeneratePin = async () => {
    if (!description) {
      toast.error(t('descriptionRequired'));
      return;
    }

    const validUntil = pinType === 'temporary' 
      ? new Date(Date.now() + parseInt(validHours) * 60 * 60 * 1000)
      : undefined;

    generatePin({
      type: pinType,
      buildingId,
      description,
      validUntil,
      maxUsage: maxUsage ? parseInt(maxUsage) : undefined
    });

    setShowGenerateDialog(false);
    resetForm();
  };

  const handleRevokePin = (pin: QBoxPin) => {
    if (confirm(t('confirmRevoke'))) {
      revokePin({ pinId: pin.id, reason: 'Manual revocation' });
    }
  };

  const handleCopyPin = (pin: string) => {
    navigator.clipboard.writeText(pin);
    toast.success(t('pinCopied'));
  };

  const handleCleanExpired = () => {
    if (confirm(t('confirmClean'))) {
      cleanExpired();
    }
  };

  const resetForm = () => {
    setPinType('temporary');
    setDescription('');
    setValidHours('24');
    setMaxUsage('');
  };

  const getPinStatusBadge = (pin: QBoxPin) => {
    switch (pin.status) {
      case 'active':
        return <Badge variant="success">{t('status.active')}</Badge>;
      case 'expired':
        return <Badge variant="secondary">{t('status.expired')}</Badge>;
      case 'revoked':
        return <Badge variant="destructive">{t('status.revoked')}</Badge>;
      case 'used':
        return <Badge variant="outline">{t('status.used')}</Badge>;
      default:
        return <Badge variant="secondary">{pin.status}</Badge>;
    }
  };

  const getPinTypeBadge = (type: QBoxPin['type']) => {
    switch (type) {
      case 'permanent':
        return <Badge variant="default">{t('type.permanent')}</Badge>;
      case 'temporary':
        return <Badge variant="secondary">{t('type.temporary')}</Badge>;
      case 'one_time':
        return <Badge variant="outline">{t('type.oneTime')}</Badge>;
      case 'recurring':
        return <Badge variant="outline">{t('type.recurring')}</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const renderPinTable = (pins: QBoxPin[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('pin')}</TableHead>
          <TableHead>{t('type')}</TableHead>
          <TableHead>{t('description')}</TableHead>
          <TableHead>{t('status')}</TableHead>
          <TableHead>{t('usage')}</TableHead>
          <TableHead>{t('validUntil')}</TableHead>
          <TableHead>{t('actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pins.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground">
              {t('noPins')}
            </TableCell>
          </TableRow>
        ) : (
          pins.map((pin) => (
            <TableRow key={pin.id}>
              <TableCell className="font-mono">
                <div className="flex items-center gap-2">
                  <span>{pin.pin}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleCopyPin(pin.pin)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
              <TableCell>{getPinTypeBadge(pin.type)}</TableCell>
              <TableCell>{pin.description}</TableCell>
              <TableCell>{getPinStatusBadge(pin)}</TableCell>
              <TableCell>
                {pin.maxUsage ? `${pin.usageCount}/${pin.maxUsage}` : pin.usageCount}
              </TableCell>
              <TableCell>
                {pin.validUntil
                  ? formatDistanceToNow(new Date(pin.validUntil), {
                      addSuffix: true,
                      locale: es
                    })
                  : '-'}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRevokePin(pin)}
                  disabled={pin.status !== 'active' || isRevoking}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('title')}</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCleanExpired}
                disabled={isCleaning || expiredPins.length === 0}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('cleanExpired')} ({expiredPins.length})
              </Button>
              <Button
                size="sm"
                onClick={() => setShowGenerateDialog(true)}
                disabled={isGenerating}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('generatePin')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('stats.total')}</CardTitle>
                <Key className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pins.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('stats.active')}</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activePins.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('stats.permanent')}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{permanentPins.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('stats.temporary')}</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{temporaryPins.length}</div>
              </CardContent>
            </Card>
          </div>

          <Separator className="mb-6" />

          {/* PIN Tables */}
          <Tabs defaultValue="active" className="space-y-4">
            <TabsList>
              <TabsTrigger value="active">{t('tabs.active')} ({activePins.length})</TabsTrigger>
              <TabsTrigger value="all">{t('tabs.all')} ({pins.length})</TabsTrigger>
              <TabsTrigger value="expired">{t('tabs.expired')} ({expiredPins.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="active" className="space-y-4">
              {renderPinTable(activePins)}
            </TabsContent>
            <TabsContent value="all" className="space-y-4">
              {renderPinTable(pins)}
            </TabsContent>
            <TabsContent value="expired" className="space-y-4">
              {renderPinTable(expiredPins)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Generate PIN Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('generatePin')}</DialogTitle>
            <DialogDescription>
              {t('generateDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin-type">{t('form.type')}</Label>
              <Select value={pinType} onValueChange={(value: QBoxPin['type']) => setPinType(value)}>
                <SelectTrigger id="pin-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="permanent">{t('type.permanent')}</SelectItem>
                  <SelectItem value="temporary">{t('type.temporary')}</SelectItem>
                  <SelectItem value="one_time">{t('type.oneTime')}</SelectItem>
                  <SelectItem value="recurring">{t('type.recurring')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('form.description')}</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('form.descriptionPlaceholder')}
              />
            </div>

            {pinType === 'temporary' && (
              <div className="space-y-2">
                <Label htmlFor="valid-hours">{t('form.validHours')}</Label>
                <Input
                  id="valid-hours"
                  type="number"
                  value={validHours}
                  onChange={(e) => setValidHours(e.target.value)}
                  min="1"
                  max="720"
                />
              </div>
            )}

            {(pinType === 'temporary' || pinType === 'one_time') && (
              <div className="space-y-2">
                <Label htmlFor="max-usage">{t('form.maxUsage')}</Label>
                <Input
                  id="max-usage"
                  type="number"
                  value={maxUsage}
                  onChange={(e) => setMaxUsage(e.target.value)}
                  placeholder={t('form.maxUsagePlaceholder')}
                  min="1"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleGeneratePin} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {t('generating')}
                </>
              ) : (
                t('generate')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}