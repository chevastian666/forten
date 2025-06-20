/**
 * React hook for HikCentral camera integration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  hikCentralCameraService, 
  HikCamera, 
  CameraPreviewUrl,
  PTZ_COMMANDS 
} from '@/services/hikvision/camera.service';
import { hikCentralWebSocket } from '@/services/hikvision/websocket';
import { createHikCentralStream, HikCentralStreaming } from '@/services/hikvision/streaming';
import { STREAM_PROFILES } from '@/services/hikvision/config';

interface UseHikCentralCameraOptions {
  autoConnect?: boolean;
  quality?: keyof typeof STREAM_PROFILES;
  protocol?: 'hls' | 'rtsp' | 'ws-flv';
}

export function useHikCentralCameras(options: UseHikCentralCameraOptions = {}) {
  const { autoConnect = true } = options;
  const queryClient = useQueryClient();

  // Initialize WebSocket connection
  useEffect(() => {
    if (autoConnect) {
      hikCentralWebSocket.connect().catch(console.error);
    }

    return () => {
      if (autoConnect) {
        hikCentralWebSocket.disconnect();
      }
    };
  }, [autoConnect]);

  // Fetch cameras list
  const {
    data: cameras,
    isLoading: isLoadingCameras,
    error: camerasError,
    refetch: refetchCameras
  } = useQuery({
    queryKey: ['hikcentral', 'cameras'],
    queryFn: () => hikCentralCameraService.getCameraList(),
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get camera preview URL mutation
  const getCameraPreviewUrl = useMutation({
    mutationFn: async ({ 
      cameraIndexCode, 
      streamType = 'main', 
      protocol = 'hls',
      quality = 'MEDIUM' 
    }: {
      cameraIndexCode: string;
      streamType?: 'main' | 'sub';
      protocol?: 'hls' | 'rtsp' | 'ws-flv';
      quality?: keyof typeof STREAM_PROFILES;
    }) => {
      return hikCentralCameraService.getCameraPreviewUrl(
        cameraIndexCode,
        streamType,
        protocol,
        quality
      );
    },
    onSuccess: (data, variables) => {
      // Cache the preview URL
      queryClient.setQueryData(
        ['hikcentral', 'camera', 'preview', variables.cameraIndexCode],
        data
      );
    }
  });

  // Subscribe to camera events
  const subscribeToCameraEvents = useCallback((
    cameraIndexCodes: string[],
    eventTypes: number[],
    callback: (event: any) => void
  ) => {
    return hikCentralCameraService.subscribeToCameraEvents(
      cameraIndexCodes,
      eventTypes,
      callback
    );
  }, []);

  // Unsubscribe from camera events
  const unsubscribeFromCameraEvents = useCallback((subscriptionId: string) => {
    hikCentralCameraService.unsubscribeFromCameraEvents(subscriptionId);
  }, []);

  return {
    cameras: cameras?.cameras || [],
    totalCameras: cameras?.total || 0,
    isLoadingCameras,
    camerasError,
    refetchCameras,
    getCameraPreviewUrl,
    subscribeToCameraEvents,
    unsubscribeFromCameraEvents,
    wsStatus: hikCentralWebSocket.getConnectionStatus()
  };
}

// Hook for individual camera control
export function useHikCentralCamera(
  cameraIndexCode: string,
  options: UseHikCentralCameraOptions = {}
) {
  const { quality = 'MEDIUM', protocol = 'hls' } = options;
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<Error | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const streamingRef = useRef<HikCentralStreaming | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const subscriptionRef = useRef<string | null>(null);

  // Get camera info
  const {
    data: cameraInfo,
    isLoading: isLoadingInfo,
    error: infoError
  } = useQuery({
    queryKey: ['hikcentral', 'camera', cameraIndexCode],
    queryFn: () => hikCentralCameraService.getCameraInfo(cameraIndexCode),
    enabled: !!cameraIndexCode,
    staleTime: 60000, // 1 minute
  });

  // Get preview URL
  const {
    data: previewUrl,
    isLoading: isLoadingUrl,
    error: urlError
  } = useQuery({
    queryKey: ['hikcentral', 'camera', 'preview', cameraIndexCode, protocol, quality],
    queryFn: () => hikCentralCameraService.getCameraPreviewUrl(
      cameraIndexCode,
      'main',
      protocol,
      quality
    ),
    enabled: !!cameraIndexCode && isStreaming,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // PTZ control mutation
  const controlPTZ = useMutation({
    mutationFn: async ({ 
      command, 
      speed = 50,
      presetIndex 
    }: {
      command: keyof typeof PTZ_COMMANDS;
      speed?: number;
      presetIndex?: number;
    }) => {
      return hikCentralCameraService.controlPTZ(
        cameraIndexCode,
        command,
        speed,
        presetIndex
      );
    }
  });

  // Start recording mutation
  const startRecording = useMutation({
    mutationFn: () => hikCentralCameraService.startManualRecording(cameraIndexCode),
    onSuccess: () => setIsRecording(true)
  });

  // Take snapshot mutation
  const takeSnapshot = useMutation({
    mutationFn: () => hikCentralCameraService.takeSnapshot(cameraIndexCode)
  });

  // Start streaming
  const startStreaming = useCallback((videoElement: HTMLVideoElement) => {
    if (!previewUrl?.url) {
      setStreamError(new Error('No preview URL available'));
      return;
    }

    videoRef.current = videoElement;
    setIsStreaming(true);
    setStreamError(null);

    try {
      // Create streaming instance
      streamingRef.current = createHikCentralStream(videoElement, {
        autoplay: true,
        muted: true,
        quality,
        onError: (error) => {
          console.error('Streaming error:', error);
          setStreamError(error);
        },
        onLoadStart: () => {
          console.log('Stream loading...');
        },
        onLoadEnd: () => {
          console.log('Stream loaded');
        }
      });

      // Load the stream
      if (protocol === 'hls') {
        streamingRef.current.loadStream(previewUrl.url);
      } else if (protocol === 'rtsp') {
        streamingRef.current.loadRTSPStream(previewUrl.url);
      }

      // Subscribe to camera events
      if (cameraInfo) {
        subscriptionRef.current = hikCentralCameraService.subscribeToCameraEvents(
          [cameraIndexCode],
          [131073, 131074], // Motion detection, video loss
          (event) => {
            console.log('Camera event:', event);
          }
        );
      }
    } catch (error) {
      console.error('Failed to start streaming:', error);
      setStreamError(error as Error);
    }
  }, [previewUrl, protocol, quality, cameraInfo, cameraIndexCode]);

  // Stop streaming
  const stopStreaming = useCallback(() => {
    setIsStreaming(false);
    
    if (streamingRef.current) {
      streamingRef.current.destroy();
      streamingRef.current = null;
    }

    if (subscriptionRef.current) {
      hikCentralCameraService.unsubscribeFromCameraEvents(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    videoRef.current = null;
  }, []);

  // Change quality
  const changeQuality = useCallback((newQuality: keyof typeof STREAM_PROFILES) => {
    if (streamingRef.current) {
      streamingRef.current.setQuality(newQuality);
    }
  }, []);

  // Get available quality levels
  const getQualityLevels = useCallback(() => {
    return streamingRef.current?.getQualityLevels() || [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, [stopStreaming]);

  return {
    // Camera info
    cameraInfo,
    isLoadingInfo,
    infoError,

    // Streaming
    isStreaming,
    streamError,
    startStreaming,
    stopStreaming,
    changeQuality,
    getQualityLevels,
    previewUrl,
    isLoadingUrl,
    urlError,

    // Controls
    controlPTZ,
    isPTZing: controlPTZ.isPending,
    ptzError: controlPTZ.error,

    // Recording
    startRecording,
    isRecording,
    recordingError: startRecording.error,

    // Snapshot
    takeSnapshot,
    isTakingSnapshot: takeSnapshot.isPending,
    snapshotError: takeSnapshot.error,

    // Stream instance (for advanced control)
    streamingInstance: streamingRef.current
  };
}

// Hook for PTZ presets
export function useHikCentralPTZPresets(cameraIndexCode: string) {
  const queryClient = useQueryClient();

  // Get presets
  const {
    data: presets,
    isLoading,
    error
  } = useQuery({
    queryKey: ['hikcentral', 'camera', cameraIndexCode, 'presets'],
    queryFn: async () => {
      // This would typically call a specific API endpoint
      // For now, returning mock data
      return [
        { id: 1, name: 'Entrance', position: { pan: 0, tilt: 0, zoom: 1 } },
        { id: 2, name: 'Parking Lot', position: { pan: 90, tilt: -10, zoom: 2 } },
        { id: 3, name: 'Back Door', position: { pan: 180, tilt: 0, zoom: 1.5 } }
      ];
    },
    enabled: !!cameraIndexCode,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Go to preset
  const goToPreset = useMutation({
    mutationFn: (presetId: number) => 
      hikCentralCameraService.controlPTZ(cameraIndexCode, 'PRESET_GOTO', 50, presetId)
  });

  // Save preset
  const savePreset = useMutation({
    mutationFn: ({ presetId, name }: { presetId: number; name: string }) => 
      hikCentralCameraService.controlPTZ(cameraIndexCode, 'PRESET_SET', 50, presetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['hikcentral', 'camera', cameraIndexCode, 'presets'] 
      });
    }
  });

  return {
    presets: presets || [],
    isLoading,
    error,
    goToPreset,
    savePreset
  };
}