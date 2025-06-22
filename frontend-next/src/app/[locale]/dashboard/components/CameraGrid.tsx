"use client";

import { useState, useEffect } from 'react';
import { VideoPlayer } from '@/components/design-system';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X } from 'lucide-react';

interface Camera {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline';
  streamUrl?: string;
}

export function CameraGrid() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCameras();
  }, []);

  const loadCameras = async () => {
    try {
      const response = await api.get('/cameras/main');
      setCameras(response.data);
    } catch {
      // Fallback data for development
      setCameras([
        {
          id: '1',
          name: 'Entrada Principal',
          location: 'Lobby',
          status: 'online',
          streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
        },
        {
          id: '2',
          name: 'Estacionamiento',
          location: 'Nivel -1',
          status: 'online',
          streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
        },
        {
          id: '3',
          name: 'Terraza',
          location: 'Piso 10',
          status: 'offline'
        },
        {
          id: '4',
          name: 'Piscina',
          location: 'Área recreativa',
          status: 'online',
          streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSnapshot = async (cameraId: string) => {
    try {
      const response = await api.post(`/cameras/${cameraId}/snapshot`);
      // Handle snapshot
      console.log('Snapshot taken:', response.data);
    } catch (error) {
      console.error('Failed to take snapshot:', error);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="aspect-video">
            <div className="w-full h-full bg-muted animate-pulse rounded-lg" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cameras.map(camera => (
          <Card
            key={camera.id}
            className="relative bg-black rounded-lg overflow-hidden cursor-pointer group hover:shadow-lg transition-shadow"
            onClick={() => camera.status === 'online' && setSelectedCamera(camera)}
          >
            <div className="aspect-video">
              {camera.status === 'online' && camera.streamUrl ? (
                <VideoPlayer
                  url={camera.streamUrl}
                  type="live"
                  isLive
                  autoPlay
                  muted
                  controls={false}
                  deviceName={camera.name}
                  location={camera.location}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <div className="text-center">
                    <span className="text-muted-foreground text-4xl">📹</span>
                    <p className="text-muted-foreground mt-2">Cámara fuera de línea</p>
                  </div>
                </div>
              )}
            </div>

            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

            {/* Camera Info */}
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              <h3 className="font-semibold">{camera.name}</h3>
              <p className="text-sm text-gray-300">{camera.location}</p>
            </div>

            {/* Status Badge */}
            <div className="absolute top-4 right-4">
              <Badge 
                variant={camera.status === 'online' ? 'default' : 'destructive'}
                className="text-xs"
              >
                {camera.status === 'online' ? 'En Vivo' : 'Offline'}
              </Badge>
            </div>
          </Card>
        ))}
      </div>

      {/* Full Screen Modal */}
      <Dialog open={!!selectedCamera} onOpenChange={() => setSelectedCamera(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] p-0 bg-black">
          {selectedCamera && (
            <>
              <VideoPlayer
                url={selectedCamera.streamUrl!}
                type="live"
                isLive
                autoPlay
                muted={false}
                controls
                deviceName={selectedCamera.name}
                location={selectedCamera.location}
                onSnapshot={() => handleSnapshot(selectedCamera.id)}
              />
              
              {/* Close Button */}
              <Button
                onClick={() => setSelectedCamera(null)}
                variant="outline"
                size="icon"
                className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 border-white/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}