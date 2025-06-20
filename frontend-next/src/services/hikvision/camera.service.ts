/**
 * HikCentral Camera Service
 * Manages camera operations, streaming, and controls
 */

import { HIKVISION_CONFIG, STREAM_PROFILES, PTZ_COMMANDS } from './config';
import { hikCentralAuth } from './auth';
import { hikCentralWebSocket } from './websocket';

export interface HikCamera {
  cameraIndexCode: string;
  cameraName: string;
  cameraType: number;
  cameraTypeName: string;
  channelNo: number;
  channelType: string;
  createTime: string;
  encodeDevIndexCode: string;
  encodeDevResourceType: string;
  gbIndexCode: string;
  installLocation: string;
  isOnline: number;
  latitude: string;
  longitude: string;
  pixel: number;
  ptz: number;
  ptzController: number;
  ptzControllerName: string;
  recordLocation: string;
  regionIndexCode: string;
  status: number;
  statusName: string;
  transType: number;
  treatyType: string;
  updateTime: string;
}

export interface CameraPreviewUrl {
  url: string;
  protocol: string;
  streamType: string;
  transmode: string;
  resolution: string;
  quality: string;
}

export interface PTZPosition {
  pan: number;
  tilt: number;
  zoom: number;
}

export interface RecordingSegment {
  beginTime: string;
  endTime: string;
  size: number;
  locationId: string;
  playbackUrl: string;
}

class HikCentralCameraService {
  private static instance: HikCentralCameraService;
  private streamingSessions: Map<string, any> = new Map();

  private constructor() {}

  static getInstance(): HikCentralCameraService {
    if (!HikCentralCameraService.instance) {
      HikCentralCameraService.instance = new HikCentralCameraService();
    }
    return HikCentralCameraService.instance;
  }

  /**
   * Get list of cameras with advanced filtering
   */
  async getCameraList(params: {
    pageNo?: number;
    pageSize?: number;
    regionIndexCode?: string;
    cameraName?: string;
    isOnline?: number;
    cameraTypes?: string[];
  } = {}): Promise<{ total: number; cameras: HikCamera[] }> {
    const url = `${HIKVISION_CONFIG.API_BASE_URL}${HIKVISION_CONFIG.ARTEMIS_PATH}${HIKVISION_CONFIG.PATHS.CAMERAS_LIST}`;
    
    const body = {
      pageNo: params.pageNo || 1,
      pageSize: params.pageSize || 100,
      ...params
    };

    const headers = await hikCentralAuth.prepareHeaders('POST', HIKVISION_CONFIG.PATHS.CAMERAS_LIST);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch cameras: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.code !== '0') {
        throw new Error(`Failed to fetch cameras: ${data.msg || 'Unknown error'}`);
      }

      return {
        total: data.data.total,
        cameras: data.data.list || []
      };
    } catch (error) {
      console.error('Error fetching camera list:', error);
      throw error;
    }
  }

  /**
   * Get camera details
   */
  async getCameraInfo(cameraIndexCode: string): Promise<HikCamera> {
    const url = `${HIKVISION_CONFIG.API_BASE_URL}${HIKVISION_CONFIG.ARTEMIS_PATH}${HIKVISION_CONFIG.PATHS.CAMERA_INFO}/${cameraIndexCode}`;
    
    const headers = await hikCentralAuth.prepareHeaders('GET', `${HIKVISION_CONFIG.PATHS.CAMERA_INFO}/${cameraIndexCode}`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch camera info: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.code !== '0') {
        throw new Error(`Failed to fetch camera info: ${data.msg || 'Unknown error'}`);
      }

      return data.data;
    } catch (error) {
      console.error('Error fetching camera info:', error);
      throw error;
    }
  }

  /**
   * Get camera preview URL for streaming
   */
  async getCameraPreviewUrl(
    cameraIndexCode: string,
    streamType: 'main' | 'sub' = 'main',
    protocol: 'rtsp' | 'hls' | 'ws-flv' = 'hls',
    quality: keyof typeof STREAM_PROFILES = 'MEDIUM'
  ): Promise<CameraPreviewUrl> {
    const url = `${HIKVISION_CONFIG.API_BASE_URL}${HIKVISION_CONFIG.ARTEMIS_PATH}${HIKVISION_CONFIG.PATHS.CAMERA_PREVIEW}`;
    
    const streamProfile = STREAM_PROFILES[quality];
    
    const body = {
      cameraIndexCode,
      streamType: streamType === 'main' ? 0 : 1,
      protocol: protocol.toUpperCase(),
      transmode: HIKVISION_CONFIG.STREAMING.TRANSMODE,
      expand: 'transcode',
      streamform: 'rtp',
      resolution: streamProfile.resolution,
      quality: quality.toLowerCase()
    };

    const headers = await hikCentralAuth.prepareHeaders('POST', HIKVISION_CONFIG.PATHS.CAMERA_PREVIEW);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Failed to get preview URL: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.code !== '0') {
        throw new Error(`Failed to get preview URL: ${data.msg || 'Unknown error'}`);
      }

      return {
        url: data.data.url,
        protocol,
        streamType,
        transmode: body.transmode,
        resolution: streamProfile.resolution,
        quality: quality.toLowerCase()
      };
    } catch (error) {
      console.error('Error getting preview URL:', error);
      throw error;
    }
  }

  /**
   * Get camera playback URL for recorded video
   */
  async getCameraPlaybackUrl(
    cameraIndexCode: string,
    beginTime: string,
    endTime: string,
    recordLocation: string = 'center',
    protocol: 'rtsp' | 'hls' = 'hls'
  ): Promise<string> {
    const url = `${HIKVISION_CONFIG.API_BASE_URL}${HIKVISION_CONFIG.ARTEMIS_PATH}${HIKVISION_CONFIG.PATHS.CAMERA_PLAYBACK}`;
    
    const body = {
      cameraIndexCode,
      beginTime,
      endTime,
      recordLocation,
      protocol: protocol.toUpperCase(),
      transmode: HIKVISION_CONFIG.STREAMING.TRANSMODE,
      expand: 'transcode'
    };

    const headers = await hikCentralAuth.prepareHeaders('POST', HIKVISION_CONFIG.PATHS.CAMERA_PLAYBACK);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Failed to get playback URL: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.code !== '0') {
        throw new Error(`Failed to get playback URL: ${data.msg || 'Unknown error'}`);
      }

      return data.data.url;
    } catch (error) {
      console.error('Error getting playback URL:', error);
      throw error;
    }
  }

  /**
   * Control PTZ camera
   */
  async controlPTZ(
    cameraIndexCode: string,
    command: keyof typeof PTZ_COMMANDS,
    speed: number = 50,
    presetIndex?: number
  ): Promise<void> {
    const url = `${HIKVISION_CONFIG.API_BASE_URL}${HIKVISION_CONFIG.ARTEMIS_PATH}${HIKVISION_CONFIG.PATHS.PTZ_CONTROL}`;
    
    const body: any = {
      cameraIndexCode,
      action: command === 'STOP' ? 1 : 0, // 0: start, 1: stop
      command: PTZ_COMMANDS[command],
      speed: Math.max(1, Math.min(100, speed))
    };

    // Add preset index for preset commands
    if (command === 'PRESET_GOTO' || command === 'PRESET_SET') {
      body.presetIndex = presetIndex;
    }

    const headers = await hikCentralAuth.prepareHeaders('POST', HIKVISION_CONFIG.PATHS.PTZ_CONTROL);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`PTZ control failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.code !== '0') {
        throw new Error(`PTZ control failed: ${data.msg || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error controlling PTZ:', error);
      throw error;
    }
  }

  /**
   * Get PTZ position
   */
  async getPTZPosition(cameraIndexCode: string): Promise<PTZPosition> {
    // This would typically require a specific API endpoint
    // For now, returning mock data as HikCentral API varies
    return {
      pan: 0,
      tilt: 0,
      zoom: 1
    };
  }

  /**
   * Start manual recording
   */
  async startManualRecording(cameraIndexCode: string): Promise<void> {
    const url = `${HIKVISION_CONFIG.API_BASE_URL}${HIKVISION_CONFIG.ARTEMIS_PATH}${HIKVISION_CONFIG.PATHS.MANUAL_RECORDING}`;
    
    const body = {
      cameraIndexCode
    };

    const headers = await hikCentralAuth.prepareHeaders('POST', HIKVISION_CONFIG.PATHS.MANUAL_RECORDING);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Failed to start recording: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.code !== '0') {
        throw new Error(`Failed to start recording: ${data.msg || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  /**
   * Search recordings
   */
  async searchRecordings(
    cameraIndexCode: string,
    beginTime: string,
    endTime: string,
    recordLocation: string = 'center'
  ): Promise<RecordingSegment[]> {
    const url = `${HIKVISION_CONFIG.API_BASE_URL}${HIKVISION_CONFIG.ARTEMIS_PATH}${HIKVISION_CONFIG.PATHS.RECORDING_SEARCH}`;
    
    const body = {
      cameraIndexCode,
      beginTime,
      endTime,
      recordLocation,
      recordType: 'all'
    };

    const headers = await hikCentralAuth.prepareHeaders('POST', HIKVISION_CONFIG.PATHS.RECORDING_SEARCH);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Failed to search recordings: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.code !== '0') {
        throw new Error(`Failed to search recordings: ${data.msg || 'Unknown error'}`);
      }

      return data.data.list || [];
    } catch (error) {
      console.error('Error searching recordings:', error);
      throw error;
    }
  }

  /**
   * Take snapshot from camera
   */
  async takeSnapshot(cameraIndexCode: string): Promise<Blob> {
    const previewUrl = await this.getCameraPreviewUrl(cameraIndexCode, 'main', 'rtsp');
    
    // This would typically involve capturing a frame from the video stream
    // For now, we'll make a request to a snapshot endpoint if available
    // or use a video frame capture service
    
    // Placeholder implementation
    const response = await fetch(previewUrl.url);
    return await response.blob();
  }

  /**
   * Subscribe to camera events
   */
  async subscribeToCameraEvents(
    cameraIndexCodes: string[],
    eventTypes: number[],
    callback: (event: any) => void
  ): Promise<string> {
    return hikCentralWebSocket.subscribeToEvents({
      resourceType: 'camera',
      resourceIndexCodes: cameraIndexCodes,
      eventTypes,
      callback
    });
  }

  /**
   * Unsubscribe from camera events
   */
  unsubscribeFromCameraEvents(subscriptionId: string): void {
    hikCentralWebSocket.unsubscribeFromEvents(subscriptionId);
  }

  /**
   * Get camera health status
   */
  async getCameraHealth(cameraIndexCode: string): Promise<{
    isOnline: boolean;
    signalStrength: number;
    fps: number;
    bitrate: number;
    packetLoss: number;
  }> {
    // This would typically involve querying device health metrics
    // Implementation depends on specific HikCentral API endpoints
    
    const camera = await this.getCameraInfo(cameraIndexCode);
    
    return {
      isOnline: camera.isOnline === 1,
      signalStrength: 95, // Mock data
      fps: 25,
      bitrate: 2048,
      packetLoss: 0.1
    };
  }

  /**
   * Cleanup streaming sessions
   */
  cleanupStreamingSessions(): void {
    this.streamingSessions.forEach((session, id) => {
      if (session.cleanup) {
        session.cleanup();
      }
    });
    this.streamingSessions.clear();
  }
}

export const hikCentralCameraService = HikCentralCameraService.getInstance();