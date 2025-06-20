"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { OptimizedVideoPlayer } from '@/components/ui/optimized-video-player';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { 
  Play, 
  Pause, 
  Camera, 
  Settings, 
  Download,
  Maximize,
  RotateCcw,
  Volume2
} from 'lucide-react';
import { api } from '@/lib/api';

interface Camera {
  id: string;
  name: string;
  location: string;
  building: string;
  status: 'online' | 'offline' | 'maintenance';
  streamUrl?: string;
  resolution: string;
  fps: number;
  isRecording: boolean;
  lastSnapshot: Date;
  deviceType: string;
  ipAddress: string;
}

export function CamerasGrid() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [loading, setLoading] = useState(true);
  const [playingCameras, setPlayingCameras] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCameras();
  }, []);

  const loadCameras = async () => {
    try {
      const response = await api.get('/cameras');
      setCameras(response.data);
    } catch {
      // Fallback data for development
      setCameras([
        {
          id: '1',
          name: 'Entrada Principal',
          location: 'Lobby',
          building: 'Torre Oceanía',
          status: 'online',
          streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
          resolution: '1920x1080',
          fps: 30,
          isRecording: true,
          lastSnapshot: new Date(Date.now() - 5 * 60 * 1000),
          deviceType: 'IP Dome',
          ipAddress: '192.168.1.101'
        },
        {
          id: '2',
          name: 'Estacionamiento',
          location: 'Nivel -1',
          building: 'Torre Oceanía',
          status: 'online',
          streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
          resolution: '1920x1080',
          fps: 25,
          isRecording: true,
          lastSnapshot: new Date(Date.now() - 3 * 60 * 1000),
          deviceType: 'IP Bullet',
          ipAddress: '192.168.1.102'
        },
        {
          id: '3',
          name: 'Terraza',
          location: 'Piso 10',
          building: 'Torre Oceanía',
          status: 'maintenance',
          resolution: '1280x720',
          fps: 15,
          isRecording: false,
          lastSnapshot: new Date(Date.now() - 24 * 60 * 60 * 1000),
          deviceType: 'IP PTZ',
          ipAddress: '192.168.1.103'
        },
        {
          id: '4',
          name: 'Piscina',
          location: 'Área recreativa',
          building: 'Vista Mar',
          status: 'online',
          streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
          resolution: '1920x1080',
          fps: 30,
          isRecording: true,
          lastSnapshot: new Date(Date.now() - 1 * 60 * 1000),
          deviceType: 'IP Dome',
          ipAddress: '192.168.1.104'
        },
        {
          id: '5',
          name: 'Entrada Servicio',
          location: 'Lateral',
          building: 'Vista Mar',
          status: 'offline',
          resolution: '1280x720',
          fps: 20,
          isRecording: false,
          lastSnapshot: new Date(Date.now() - 2 * 60 * 60 * 1000),
          deviceType: 'IP Bullet',
          ipAddress: '192.168.1.105'
        },
        {
          id: '6',
          name: 'Ascensor Principal',
          location: 'Lobby',
          building: 'Carrasco',
          status: 'online',
          streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
          resolution: '1920x1080',
          fps: 30,
          isRecording: true,
          lastSnapshot: new Date(Date.now() - 2 * 60 * 1000),
          deviceType: 'IP Fixed',
          ipAddress: '192.168.1.106'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: Camera['status']) => {
    switch (status) {
      case 'online': return 'default';
      case 'offline': return 'destructive';
      case 'maintenance': return 'secondary';
    }
  };

  const getStatusText = (status: Camera['status']) => {
    switch (status) {
      case 'online': return 'En línea';
      case 'offline': return 'Fuera de línea';
      case 'maintenance': return 'Mantenimiento';
    }
  };

  const togglePlayback = (cameraId: string) => {
    setPlayingCameras(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cameraId)) {
        newSet.delete(cameraId);
      } else {
        newSet.add(cameraId);
      }
      return newSet;
    });
  };

  const handleSnapshot = async (cameraId: string) => {
    try {
      await api.post(`/cameras/${cameraId}/snapshot`);
    } catch (error) {
      console.error('Failed to take snapshot:', error);
    }
  };

  if (loading) {
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

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cameras.map(camera => (
          <Card key={camera.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{camera.name}</CardTitle>
                  <div className="text-sm text-muted-foreground">
                    {camera.location} • {camera.building}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusVariant(camera.status)}>
                    {getStatusText(camera.status)}
                  </Badge>
                  {camera.isRecording && (
                    <Badge variant="outline" className="text-red-600 border-red-600">
                      REC
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4 relative group">
                {camera.status === 'online' && camera.streamUrl ? (
                  <OptimizedVideoPlayer
                    url={camera.streamUrl}
                    type="live"
                    isLive
                    autoPlay={playingCameras.has(camera.id)}
                    muted
                    controls={false}
                    deviceName={camera.name}
                    location={camera.location}
                    className="w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <div className="text-center">
                      <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {camera.status === 'offline' ? 'Cámara fuera de línea' : 'En mantenimiento'}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Overlay Controls */}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="flex gap-2">
                    {camera.status === 'online' && (
                      <>
                        <Button
                          size="icon"
                          variant="secondary"
                          onClick={() => togglePlayback(camera.id)}
                        >
                          {playingCameras.has(camera.id) ? 
                            <Pause className="h-4 w-4" /> : 
                            <Play className="h-4 w-4" />
                          }
                        </Button>
                        <Button
                          size="icon"
                          variant="secondary"
                          onClick={() => setSelectedCamera(camera)}
                        >
                          <Maximize className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Camera Info */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Resolución:</span>
                  <span>{camera.resolution}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">FPS:</span>
                  <span>{camera.fps}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span>{camera.deviceType}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleSnapshot(camera.id)}
                  disabled={camera.status !== 'online'}
                >
                  <Camera className="h-3 w-3 mr-1" />
                  Snapshot
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Settings className="h-3 w-3 mr-1" />
                  Config
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Full Screen Modal */}
      <Dialog open={!!selectedCamera} onOpenChange={() => setSelectedCamera(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] p-0 bg-black">
          {selectedCamera && (
            <>
              <div className="relative">
                <OptimizedVideoPlayer
                  url={selectedCamera.streamUrl!}
                  type="live"
                  isLive
                  autoPlay
                  muted={false}
                  controls
                  deviceName={selectedCamera.name}
                  location={selectedCamera.location}
                  onSnapshot={() => handleSnapshot(selectedCamera.id)}
                  className="w-full h-full"
                />
                
                {/* Camera Info Overlay */}
                <div className="absolute top-4 left-4 bg-black/70 text-white p-3 rounded-lg">
                  <h3 className="font-semibold">{selectedCamera.name}</h3>
                  <p className="text-sm opacity-90">
                    {selectedCamera.location} • {selectedCamera.building}
                  </p>
                  <p className="text-xs opacity-75">
                    {selectedCamera.resolution} • {selectedCamera.fps} FPS
                  </p>
                </div>

                {/* Controls */}
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <Button variant="secondary" size="icon">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button variant="secondary" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="secondary" size="icon">
                    <Volume2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}