"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  Maximize,
  Minimize,
  Camera,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { throttle } from '@/utils/performance';

interface OptimizedVideoPlayerProps {
  url?: string;
  type?: 'live' | 'recorded';
  isLive?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  deviceName?: string;
  location?: string;
  onSnapshot?: () => void;
  className?: string;
  width?: number;
  height?: number;
}

export function OptimizedVideoPlayer({
  url,
  type = 'live',
  isLive = false,
  autoPlay = false,
  muted = true,
  controls = true,
  deviceName,
  location,
  onSnapshot,
  className,
  width = 640,
  height = 360
}: OptimizedVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(muted);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showControls, setShowControls] = useState(false);

  // Throttled mouse move handler for control visibility
  const handleMouseMove = useCallback(
    throttle(() => {
      setShowControls(true);
      setTimeout(() => setShowControls(false), 3000);
    }, 100),
    []
  );

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const handleReload = useCallback(() => {
    if (!videoRef.current) return;
    
    setError(false);
    setIsLoading(true);
    videoRef.current.load();
  }, []);

  // Video event handlers
  const handleLoadStart = () => setIsLoading(true);
  const handleCanPlay = () => setIsLoading(false);
  const handleError = () => {
    setError(true);
    setIsLoading(false);
  };

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto-hide controls in fullscreen
  useEffect(() => {
    if (isFullscreen && showControls) {
      const timer = setTimeout(() => setShowControls(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isFullscreen, showControls]);

  if (error) {
    return (
      <Card className={cn(
        "relative bg-black text-white flex items-center justify-center",
        className
      )} style={{ width, height }}>
        <div className="text-center space-y-4">
          <Camera className="h-12 w-12 mx-auto text-muted-foreground" />
          <div>
            <p className="text-sm">Error al cargar el video</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleReload}
              className="mt-2"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        "relative bg-black overflow-hidden cursor-pointer group",
        isFullscreen && "fixed inset-0 z-50 rounded-none",
        className
      )}
      style={!isFullscreen ? { width, height } : undefined}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        autoPlay={autoPlay}
        muted={muted}
        loop={type === 'live'}
        playsInline
        onLoadStart={handleLoadStart}
        onCanPlay={handleCanPlay}
        onError={handleError}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      >
        {url && <source src={url} type="video/mp4" />}
        Su navegador no soporta el elemento video.
      </video>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      )}

      {/* Device Info Overlay */}
      {(deviceName || location) && (
        <div className="absolute top-4 left-4 bg-black/70 text-white p-2 rounded">
          {deviceName && <div className="font-medium text-sm">{deviceName}</div>}
          {location && <div className="text-xs opacity-90">{location}</div>}
        </div>
      )}

      {/* Live Badge */}
      {isLive && (
        <div className="absolute top-4 right-4">
          <Badge variant="destructive" className="bg-red-600">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-1" />
            EN VIVO
          </Badge>
        </div>
      )}

      {/* Controls Overlay */}
      {controls && (
        <div 
          className={cn(
            "absolute inset-0 bg-gradient-to-t from-black/50 to-transparent transition-opacity",
            showControls || !isPlaying ? "opacity-100" : "opacity-0"
          )}
        >
          {/* Center Play/Pause Button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              variant="secondary"
              size="icon"
              className="h-16 w-16 bg-black/50 hover:bg-black/70"
              onClick={togglePlay}
            >
              {isPlaying ? 
                <Pause className="h-8 w-8" /> : 
                <Play className="h-8 w-8 ml-1" />
              }
            </Button>
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-black/50 hover:bg-black/70"
                onClick={togglePlay}
              >
                {isPlaying ? 
                  <Pause className="h-4 w-4" /> : 
                  <Play className="h-4 w-4" />
                }
              </Button>
              
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-black/50 hover:bg-black/70"
                onClick={toggleMute}
              >
                {isMuted ? 
                  <VolumeX className="h-4 w-4" /> : 
                  <Volume2 className="h-4 w-4" />
                }
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {onSnapshot && (
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 bg-black/50 hover:bg-black/70"
                  onClick={onSnapshot}
                >
                  <Camera className="h-4 w-4" />
                </Button>
              )}
              
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-black/50 hover:bg-black/70"
                onClick={handleReload}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-black/50 hover:bg-black/70"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? 
                  <Minimize className="h-4 w-4" /> : 
                  <Maximize className="h-4 w-4" />
                }
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}