import { ICameraRepository } from '../../domain/repositories/ICameraRepository';
import { Camera, CameraStatus } from '../../domain/entities/Camera';
import { HikCentralService } from '../../infrastructure/services/HikCentralService';
import { StreamingService } from '../../infrastructure/services/StreamingService';
import { Logger } from '../../utils/Logger';

export interface StreamSession {
  id: string;
  cameraId: string;
  userId: string;
  streamType: 'live' | 'playback';
  quality: 'low' | 'medium' | 'high';
  startTime: Date;
  endTime?: Date;
  metadata: Record<string, any>;
}

export interface PlaybackOptions {
  startTime: Date;
  endTime: Date;
  speed: number;
  quality: 'low' | 'medium' | 'high';
}

export class StreamingUseCase {
  private activeSessions: Map<string, StreamSession> = new Map();

  constructor(
    private cameraRepository: ICameraRepository,
    private hikCentralService: HikCentralService,
    private streamingService: StreamingService,
    private logger: Logger
  ) {}

  async startLiveStream(cameraId: string, userId: string, quality: 'low' | 'medium' | 'high' = 'medium'): Promise<StreamSession> {
    try {
      const camera = await this.cameraRepository.findById(cameraId);
      if (!camera) {
        throw new Error('Camera not found');
      }

      if (camera.status !== CameraStatus.ONLINE) {
        throw new Error('Camera is not online');
      }

      // Create stream session
      const sessionId = `live_${cameraId}_${userId}_${Date.now()}`;
      const session: StreamSession = {
        id: sessionId,
        cameraId,
        userId,
        streamType: 'live',
        quality,
        startTime: new Date(),
        metadata: {
          cameraName: camera.name,
          location: camera.location,
          building: camera.buildingId
        }
      };

      // Get stream URL from HikCentral
      const streamUrl = await this.hikCentralService.getLiveStreamUrl(camera.hikCentralId!, quality);
      
      // Start streaming service
      await this.streamingService.startStream(sessionId, streamUrl, {
        quality,
        format: 'hls', // HTTP Live Streaming
        segmentDuration: 6,
        playlistSize: 10
      });

      this.activeSessions.set(sessionId, session);
      
      this.logger.info(`Live stream started: ${sessionId} for camera ${cameraId}`);
      return session;
    } catch (error) {
      this.logger.error(`Failed to start live stream: ${error.message}`);
      throw error;
    }
  }

  async startPlaybackStream(
    cameraId: string, 
    userId: string, 
    options: PlaybackOptions
  ): Promise<StreamSession> {
    try {
      const camera = await this.cameraRepository.findById(cameraId);
      if (!camera) {
        throw new Error('Camera not found');
      }

      // Create stream session
      const sessionId = `playback_${cameraId}_${userId}_${Date.now()}`;
      const session: StreamSession = {
        id: sessionId,
        cameraId,
        userId,
        streamType: 'playback',
        quality: options.quality,
        startTime: new Date(),
        metadata: {
          cameraName: camera.name,
          location: camera.location,
          building: camera.buildingId,
          playbackStart: options.startTime,
          playbackEnd: options.endTime,
          speed: options.speed
        }
      };

      // Get playback stream URL from HikCentral
      const streamUrl = await this.hikCentralService.getPlaybackStreamUrl(
        camera.hikCentralId!,
        options.startTime,
        options.endTime,
        options.quality
      );
      
      // Start streaming service with playback configuration
      await this.streamingService.startStream(sessionId, streamUrl, {
        quality: options.quality,
        format: 'hls',
        segmentDuration: 6,
        playlistSize: 10,
        speed: options.speed
      });

      this.activeSessions.set(sessionId, session);
      
      this.logger.info(`Playback stream started: ${sessionId} for camera ${cameraId}`);
      return session;
    } catch (error) {
      this.logger.error(`Failed to start playback stream: ${error.message}`);
      throw error;
    }
  }

  async stopStream(sessionId: string): Promise<void> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error('Stream session not found');
      }

      // Stop streaming service
      await this.streamingService.stopStream(sessionId);

      // Update session end time
      session.endTime = new Date();
      
      // Remove from active sessions
      this.activeSessions.delete(sessionId);
      
      this.logger.info(`Stream stopped: ${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to stop stream: ${error.message}`);
      throw error;
    }
  }

  async getStreamUrl(sessionId: string): Promise<string> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Stream session not found');
    }

    return this.streamingService.getStreamUrl(sessionId);
  }

  async getActiveStreams(userId?: string): Promise<StreamSession[]> {
    const sessions = Array.from(this.activeSessions.values());
    
    if (userId) {
      return sessions.filter(session => session.userId === userId);
    }
    
    return sessions;
  }

  async captureSnapshot(cameraId: string, userId: string): Promise<string> {
    try {
      const camera = await this.cameraRepository.findById(cameraId);
      if (!camera) {
        throw new Error('Camera not found');
      }

      if (camera.status !== CameraStatus.ONLINE) {
        throw new Error('Camera is not online');
      }

      // Capture snapshot via HikCentral
      const snapshotUrl = await this.hikCentralService.captureSnapshot(camera.hikCentralId!);
      
      this.logger.info(`Snapshot captured for camera ${cameraId} by user ${userId}`);
      return snapshotUrl;
    } catch (error) {
      this.logger.error(`Failed to capture snapshot: ${error.message}`);
      throw error;
    }
  }

  async controlPTZ(cameraId: string, userId: string, command: PTZCommand): Promise<void> {
    try {
      const camera = await this.cameraRepository.findById(cameraId);
      if (!camera) {
        throw new Error('Camera not found');
      }

      if (camera.status !== CameraStatus.ONLINE) {
        throw new Error('Camera is not online');
      }

      if (!camera.capabilities.ptz) {
        throw new Error('Camera does not support PTZ');
      }

      // Send PTZ command via HikCentral
      await this.hikCentralService.controlPTZ(camera.hikCentralId!, command);
      
      this.logger.info(`PTZ command ${command.action} sent to camera ${cameraId} by user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to control PTZ: ${error.message}`);
      throw error;
    }
  }

  async getRecordings(cameraId: string, startTime: Date, endTime: Date): Promise<Recording[]> {
    try {
      const camera = await this.cameraRepository.findById(cameraId);
      if (!camera) {
        throw new Error('Camera not found');
      }

      // Get recordings from HikCentral
      const recordings = await this.hikCentralService.getRecordings(
        camera.hikCentralId!,
        startTime,
        endTime
      );
      
      return recordings;
    } catch (error) {
      this.logger.error(`Failed to get recordings: ${error.message}`);
      throw error;
    }
  }

  async downloadRecording(recordingId: string, userId: string): Promise<string> {
    try {
      // Get download URL from HikCentral
      const downloadUrl = await this.hikCentralService.getRecordingDownloadUrl(recordingId);
      
      this.logger.info(`Recording download initiated: ${recordingId} by user ${userId}`);
      return downloadUrl;
    } catch (error) {
      this.logger.error(`Failed to download recording: ${error.message}`);
      throw error;
    }
  }

  async cleanupInactiveSessions(): Promise<void> {
    try {
      const now = new Date();
      const inactiveThreshold = 30 * 60 * 1000; // 30 minutes

      for (const [sessionId, session] of this.activeSessions.entries()) {
        const lastActivity = session.startTime.getTime();
        
        if (now.getTime() - lastActivity > inactiveThreshold) {
          try {
            await this.stopStream(sessionId);
            this.logger.info(`Cleaned up inactive stream session: ${sessionId}`);
          } catch (error) {
            this.logger.warn(`Failed to cleanup session ${sessionId}: ${error.message}`);
            this.activeSessions.delete(sessionId);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to cleanup inactive sessions: ${error.message}`);
    }
  }
}

export interface PTZCommand {
  action: 'pan' | 'tilt' | 'zoom' | 'preset' | 'stop';
  direction?: 'left' | 'right' | 'up' | 'down' | 'in' | 'out';
  speed?: number;
  presetId?: number;
}

export interface Recording {
  id: string;
  cameraId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  size: number;
  type: 'continuous' | 'motion' | 'alarm';
  quality: string;
  downloadUrl?: string;
}