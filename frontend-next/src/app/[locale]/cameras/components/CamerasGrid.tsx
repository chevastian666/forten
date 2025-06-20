"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HikCentralVideoPlayer } from '@/components/ui/hikcentral-video-player';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Settings,
  Maximize,
  Loader2,
  AlertCircle,
  Wifi,
  WifiOff,
  Wrench
} from 'lucide-react';
import { useHikCentralCameras } from '@/hooks/useHikCentralCamera';
import { cn } from '@/lib/utils';

export function CamerasGrid() {
  const [selectedCamera, setSelectedCamera] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'focus'>('grid');
  
  const {
    cameras,
    totalCameras,
    isLoadingCameras,
    camerasError,
    wsStatus
  } = useHikCentralCameras();

  const getStatusIcon = (status: number) => {
    switch (status) {
      case 1: // Online
        return <Wifi className="h-4 w-4 text-green-600" />;
      case 0: // Offline
        return <WifiOff className="h-4 w-4 text-red-600" />;
      default:
        return <Wrench className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 1: return 'En línea';
      case 0: return 'Fuera de línea';
      default: return 'Mantenimiento';
    }
  };

  const getStatusVariant = (status: number): "default" | "destructive" | "secondary" => {
    switch (status) {
      case 1: return 'default';
      case 0: return 'destructive';
      default: return 'secondary';
    }
  };

  if (isLoadingCameras) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-muted rounded mb-4"></div>
              <div className="flex gap-2">
                <div className="h-8 bg-muted rounded flex-1"></div>
                <div className="h-8 bg-muted rounded w-8"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (camerasError) {
    return (
      <Card className="p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error al cargar cámaras</h3>
          <p className="text-sm text-muted-foreground mb-4">
            No se pudo conectar con el sistema HikCentral
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Reintentar
          </Button>
        </div>
      </Card>
    );
  }

  if (cameras.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <p className="text-muted-foreground">No se encontraron cámaras configuradas</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      {/* WebSocket Status */}
      {wsStatus && (
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <div className={cn(
            "w-2 h-2 rounded-full",
            wsStatus.isConnected ? "bg-green-500" : "bg-red-500"
          )} />
          {wsStatus.isConnected ? 'Conectado' : 'Desconectado'} al sistema de eventos
          {wsStatus.subscriptionCount > 0 && (
            <span> • {wsStatus.subscriptionCount} suscripciones activas</span>
          )}
        </div>
      )}

      {/* Cameras Grid */}
      <div className={cn(
        "grid gap-6",
        viewMode === 'grid' 
          ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" 
          : "grid-cols-1"
      )}>
        {cameras.map(camera => (
          <Card key={camera.cameraIndexCode} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{camera.cameraName}</CardTitle>
                  <div className="text-sm text-muted-foreground">
                    {camera.installLocation || 'Sin ubicación'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(camera.isOnline)}
                  <Badge variant={getStatusVariant(camera.isOnline)}>
                    {getStatusText(camera.isOnline)}
                  </Badge>
                  {camera.status === 1 && (
                    <Badge variant="outline" className="text-red-600 border-red-600">
                      REC
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              {/* Video Player */}
              <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
                {camera.isOnline === 1 ? (
                  <HikCentralVideoPlayer
                    cameraIndexCode={camera.cameraIndexCode}
                    cameraName={camera.cameraName}
                    location={camera.installLocation}
                    showControls={true}
                    showPTZ={camera.ptz === 1}
                    autoStart={viewMode === 'focus'}
                    quality="MEDIUM"
                    className="w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <div className="text-center">
                      {camera.isOnline === 0 ? (
                        <>
                          <WifiOff className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Cámara fuera de línea</p>
                        </>
                      ) : (
                        <>
                          <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">En mantenimiento</p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Camera Info */}
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span>{camera.cameraTypeName || camera.deviceType || 'IP Camera'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Resolución:</span>
                  <span>{camera.pixel ? `${camera.pixel}P` : '1080P'}</span>
                </div>
                {camera.ptz === 1 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">PTZ:</span>
                    <span className="text-green-600">Disponible</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Canal:</span>
                  <span>{camera.channelNo || 1}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => setSelectedCamera(camera)}
                  disabled={camera.isOnline !== 1}
                >
                  <Maximize className="h-3 w-3 mr-1" />
                  Ver en grande
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={camera.isOnline !== 1}
                >
                  <Settings className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Full Screen Modal */}
      <Dialog open={!!selectedCamera} onOpenChange={() => setSelectedCamera(null)}>
        <DialogContent className="max-w-7xl max-h-[95vh] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>
              {selectedCamera?.cameraName} - {selectedCamera?.installLocation}
            </DialogTitle>
          </DialogHeader>
          {selectedCamera && (
            <div className="p-4 pt-2">
              <HikCentralVideoPlayer
                cameraIndexCode={selectedCamera.cameraIndexCode}
                cameraName={selectedCamera.cameraName}
                location={selectedCamera.installLocation}
                showControls={true}
                showPTZ={selectedCamera.ptz === 1}
                autoStart={true}
                quality="HIGH"
                className="w-full aspect-video"
                onSnapshot={(blob) => {
                  // Handle snapshot
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${selectedCamera.cameraName}_${new Date().getTime()}.jpg`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              />
              
              {/* Additional camera details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="bg-muted p-3 rounded">
                  <p className="text-xs text-muted-foreground">Dispositivo</p>
                  <p className="font-medium">{selectedCamera.encodeDevIndexCode}</p>
                </div>
                <div className="bg-muted p-3 rounded">
                  <p className="text-xs text-muted-foreground">IP</p>
                  <p className="font-medium">{selectedCamera.gbIndexCode || 'N/A'}</p>
                </div>
                <div className="bg-muted p-3 rounded">
                  <p className="text-xs text-muted-foreground">Última actualización</p>
                  <p className="font-medium">
                    {new Date(selectedCamera.updateTime).toLocaleDateString()}
                  </p>
                </div>
                <div className="bg-muted p-3 rounded">
                  <p className="text-xs text-muted-foreground">Grabación</p>
                  <p className="font-medium">{selectedCamera.recordLocation || 'Local'}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}