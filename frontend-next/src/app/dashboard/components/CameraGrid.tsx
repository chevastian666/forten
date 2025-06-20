"use client";

import { useState, useEffect } from 'react';
import { VideoPlayer } from '@/components/design-system';
import { api } from '@/lib/api';

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
          <div key={i} className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cameras.map(camera => (
          <div
            key={camera.id}
            className="relative bg-black rounded-lg overflow-hidden cursor-pointer group"
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
                <div className="w-full h-full flex items-center justify-center bg-gray-900">
                  <div className="text-center">
                    <span className="text-gray-400 text-lg">📹</span>
                    <p className="text-gray-400 mt-2">Cámara fuera de línea</p>
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
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                camera.status === 'online'
                  ? 'bg-green-500 text-white'
                  : 'bg-red-500 text-white'
              }`}>
                {camera.status === 'online' ? 'En Vivo' : 'Offline'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Full Screen Modal */}
      {selectedCamera && (
        <div 
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onClick={() => setSelectedCamera(null)}
        >
          <div className="relative w-full h-full max-w-6xl max-h-[90vh] m-4">
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
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCamera(null);
              }}
              className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}