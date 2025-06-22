"use client";

import { useRef, useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  Maximize,
  Minimize,
  Camera,
  RefreshCw,
  Loader2,
  Settings,
  Download,
  Circle,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Save
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHikCentralCamera, useHikCentralPTZPresets } from '@/hooks/useHikCentralCamera';
import { STREAM_PROFILES } from '@/services/hikvision/config';

interface HikCentralVideoPlayerProps {
  cameraIndexCode: string;
  cameraName?: string;
  location?: string;
  className?: string;
  showControls?: boolean;
  showPTZ?: boolean;
  autoStart?: boolean;
  quality?: keyof typeof STREAM_PROFILES;
  onSnapshot?: (blob: Blob) => void;
}

export function HikCentralVideoPlayer({
  cameraIndexCode,
  cameraName,
  location,
  className,
  showControls = true,
  showPTZ = false,
  autoStart = true,
  quality = 'MEDIUM',
  onSnapshot
}: HikCentralVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [currentQuality, setCurrentQuality] = useState<keyof typeof STREAM_PROFILES>(quality);
  const [ptzSpeed, setPtzSpeed] = useState(50);

  const {
    cameraInfo,
    isStreaming,
    streamError,
    startStreaming,
    stopStreaming,
    changeQuality,
    getQualityLevels,
    controlPTZ,
    isPTZing,
    takeSnapshot,
    isTakingSnapshot,
    startRecording,
    isRecording,
    streamingInstance
  } = useHikCentralCamera(cameraIndexCode, { quality });

  const {
    presets,
    goToPreset,
    savePreset
  } = useHikCentralPTZPresets(cameraIndexCode);

  // Auto-start streaming
  useEffect(() => {
    if (autoStart && videoRef.current && !isStreaming) {
      startStreaming(videoRef.current);
    }
  }, [autoStart, startStreaming, isStreaming]);

  // Update playing state
  useEffect(() => {
    if (!videoRef.current) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    videoRef.current.addEventListener('play', handlePlay);
    videoRef.current.addEventListener('pause', handlePause);

    return () => {
      if (videoRef.current) {
        videoRef.current.removeEventListener('play', handlePlay);
        videoRef.current.removeEventListener('pause', handlePause);
      }
    };
  }, []);

  const togglePlay = useCallback(() => {
    if (!streamingInstance) return;
    
    if (isPlaying) {
      streamingInstance.pause();
    } else {
      streamingInstance.play();
    }
  }, [isPlaying, streamingInstance]);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
  }, [isMuted]);

  const handleVolumeChange = useCallback((value: number[]) => {
    if (!streamingInstance) return;
    
    const newVolume = value[0];
    streamingInstance.setVolume(newVolume);
    setVolume(newVolume);
    
    if (newVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  }, [streamingInstance, isMuted]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const handleQualityChange = useCallback((newQuality: keyof typeof STREAM_PROFILES) => {
    setCurrentQuality(newQuality);
    changeQuality(newQuality);
  }, [changeQuality]);

  const handleSnapshot = useCallback(async () => {
    const result = await takeSnapshot.mutateAsync();
    if (result && onSnapshot) {
      onSnapshot(result);
    }
  }, [takeSnapshot, onSnapshot]);

  const handlePTZControl = useCallback((command: string) => {
    controlPTZ.mutate({ command: command as any, speed: ptzSpeed });
  }, [controlPTZ, ptzSpeed]);

  const handlePTZStop = useCallback(() => {
    controlPTZ.mutate({ command: 'STOP' });
  }, [controlPTZ]);

  const handlePresetGoto = useCallback((presetId: number) => {
    goToPreset.mutate(presetId);
  }, [goToPreset]);

  const handlePresetSave = useCallback((presetId: number, name: string) => {
    savePreset.mutate({ presetId, name });
  }, [savePreset]);

  if (streamError) {
    return (
      <Card className={cn("flex items-center justify-center bg-black", className)}>
        <div className="text-center space-y-4 p-8">
          <Camera className="h-12 w-12 mx-auto text-muted-foreground" />
          <div className="text-white">
            <p className="text-sm mb-2">Error al cargar el video</p>
            <p className="text-xs text-muted-foreground">{streamError.message}</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => videoRef.current && startStreaming(videoRef.current)}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      ref={containerRef}
      className={cn(
        "relative bg-black overflow-hidden group",
        isFullscreen && "fixed inset-0 z-50 rounded-none",
        className
      )}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        muted={isMuted}
      />

      {/* Loading Overlay */}
      {!isStreaming && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-white mb-2" />
            <p className="text-white text-sm">Conectando...</p>
          </div>
        </div>
      )}

      {/* Camera Info Overlay */}
      <div className="absolute top-4 left-4 bg-black/70 text-white p-3 rounded-lg">
        <h3 className="font-semibold text-sm">{cameraName || cameraInfo?.cameraName}</h3>
        {location && <p className="text-xs opacity-90">{location}</p>}
        {cameraInfo && (
          <p className="text-xs opacity-75 mt-1">
            {cameraInfo.resolution} • {cameraInfo.fps} FPS
          </p>
        )}
      </div>

      {/* Status Badges */}
      <div className="absolute top-4 right-4 flex gap-2">
        {cameraInfo?.isOnline === 1 && (
          <Badge variant="default" className="bg-green-600">
            <Circle className="h-2 w-2 fill-white mr-1" />
            EN LÍNEA
          </Badge>
        )}
        {isRecording && (
          <Badge variant="destructive">
            <Circle className="h-2 w-2 fill-white animate-pulse mr-1" />
            REC
          </Badge>
        )}
      </div>

      {/* Controls */}
      {showControls && (
        <div className={cn(
          "absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent transition-opacity",
          "opacity-0 group-hover:opacity-100"
        )}>
          {/* PTZ Controls */}
          {showPTZ && cameraInfo?.ptz === 1 && (
            <div className="absolute top-20 right-4 bg-black/70 p-4 rounded-lg">
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div />
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8"
                  onMouseDown={() => handlePTZControl('UP')}
                  onMouseUp={handlePTZStop}
                  onMouseLeave={handlePTZStop}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <div />
                
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8"
                  onMouseDown={() => handlePTZControl('LEFT')}
                  onMouseUp={handlePTZStop}
                  onMouseLeave={handlePTZStop}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8"
                  onClick={handlePTZStop}
                >
                  <Circle className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8"
                  onMouseDown={() => handlePTZControl('RIGHT')}
                  onMouseUp={handlePTZStop}
                  onMouseLeave={handlePTZStop}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
                
                <div />
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8"
                  onMouseDown={() => handlePTZControl('DOWN')}
                  onMouseUp={handlePTZStop}
                  onMouseLeave={handlePTZStop}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <div />
              </div>
              
              <div className="flex gap-2 mb-3">
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 flex-1"
                  onMouseDown={() => handlePTZControl('ZOOM_IN')}
                  onMouseUp={handlePTZStop}
                  onMouseLeave={handlePTZStop}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 flex-1"
                  onMouseDown={() => handlePTZControl('ZOOM_OUT')}
                  onMouseUp={handlePTZStop}
                  onMouseLeave={handlePTZStop}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-white">Velocidad: {ptzSpeed}%</label>
                <Slider
                  value={[ptzSpeed]}
                  onValueChange={(v) => setPtzSpeed(v[0])}
                  min={1}
                  max={100}
                  step={10}
                  className="w-full"
                />
              </div>

              {presets.length > 0 && (
                <div className="mt-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="sm" className="w-full">
                        <Save className="h-3 w-3 mr-1" />
                        Presets
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>Ir a preset</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {presets.map(preset => (
                        <DropdownMenuItem
                          key={preset.id}
                          onClick={() => handlePresetGoto(preset.id)}
                        >
                          {preset.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          )}

          {/* Bottom Controls */}
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center justify-between gap-4">
              {/* Left Controls */}
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 bg-black/50"
                  onClick={togglePlay}
                >
                  {isPlaying ? 
                    <Pause className="h-4 w-4" /> : 
                    <Play className="h-4 w-4" />
                  }
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 bg-black/50"
                    onClick={toggleMute}
                  >
                    {isMuted || volume === 0 ? 
                      <VolumeX className="h-4 w-4" /> : 
                      <Volume2 className="h-4 w-4" />
                    }
                  </Button>
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    onValueChange={handleVolumeChange}
                    max={1}
                    step={0.1}
                    className="w-24"
                  />
                </div>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-2">
                {/* Quality Selector */}
                <Select value={currentQuality} onValueChange={handleQualityChange}>
                  <SelectTrigger className="h-8 w-24 bg-black/50 text-white border-white/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HIGH">Alta</SelectItem>
                    <SelectItem value="MEDIUM">Media</SelectItem>
                    <SelectItem value="LOW">Baja</SelectItem>
                    <SelectItem value="MOBILE">Móvil</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 bg-black/50"
                  onClick={handleSnapshot}
                  disabled={isTakingSnapshot}
                >
                  {isTakingSnapshot ? 
                    <Loader2 className="h-4 w-4 animate-spin" /> :
                    <Camera className="h-4 w-4" />
                  }
                </Button>

                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 bg-black/50"
                  onClick={() => startRecording.mutate()}
                  disabled={isRecording}
                >
                  <Circle className={cn(
                    "h-4 w-4",
                    isRecording && "fill-red-500 animate-pulse"
                  )} />
                </Button>

                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 bg-black/50"
                  onClick={toggleFullscreen}
                >
                  {isFullscreen ? 
                    <Minimize className="h-4 w-4" /> : 
                    <Maximize className="h-4 w-4" />
                  }
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8 bg-black/50"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Opciones</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowAdvancedControls(!showAdvancedControls)}>
                      Controles avanzados
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Download className="h-4 w-4 mr-2" />
                      Descargar grabación
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <RotateCw className="h-4 w-4 mr-2" />
                      Reiniciar stream
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Debug Info (dev only) */}
      {process.env.NODE_ENV === 'development' && showAdvancedControls && (
        <div className="absolute bottom-20 left-4 bg-black/70 text-white p-2 rounded text-xs">
          <div>Stream Quality: {currentQuality}</div>
          <div>Camera: {cameraInfo?.cameraName}</div>
          <div>Status: {cameraInfo?.isOnline === 1 ? 'Online' : 'Offline'}</div>
          {isPTZing && <div>PTZ Active</div>}
        </div>
      )}
    </Card>
  );
}