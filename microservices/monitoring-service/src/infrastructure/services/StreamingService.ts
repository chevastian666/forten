import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { Logger } from '../../utils/Logger';

export interface StreamConfig {
  quality: 'low' | 'medium' | 'high';
  format: 'hls' | 'dash' | 'rtmp';
  segmentDuration: number;
  playlistSize: number;
  speed?: number;
}

export interface StreamInfo {
  sessionId: string;
  inputUrl: string;
  outputPath: string;
  config: StreamConfig;
  process?: ChildProcess;
  startTime: Date;
  lastAccess: Date;
}

export class StreamingService {
  private activeStreams: Map<string, StreamInfo> = new Map();
  private readonly streamDir: string;
  private readonly baseUrl: string;

  constructor(
    streamDir: string,
    baseUrl: string,
    private logger: Logger
  ) {
    this.streamDir = streamDir;
    this.baseUrl = baseUrl;
    this.ensureStreamDirectory();
  }

  private async ensureStreamDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.streamDir, { recursive: true });
    } catch (error) {
      this.logger.error(`Failed to create stream directory: ${error.message}`);
    }
  }

  async startStream(sessionId: string, inputUrl: string, config: StreamConfig): Promise<void> {
    try {
      if (this.activeStreams.has(sessionId)) {
        throw new Error(`Stream session already exists: ${sessionId}`);
      }

      const outputPath = path.join(this.streamDir, sessionId);
      await fs.mkdir(outputPath, { recursive: true });

      const streamInfo: StreamInfo = {
        sessionId,
        inputUrl,
        outputPath,
        config,
        startTime: new Date(),
        lastAccess: new Date()
      };

      // Start FFmpeg process based on format
      switch (config.format) {
        case 'hls':
          streamInfo.process = await this.startHLSStream(streamInfo);
          break;
        case 'dash':
          streamInfo.process = await this.startDASHStream(streamInfo);
          break;
        case 'rtmp':
          streamInfo.process = await this.startRTMPStream(streamInfo);
          break;
        default:
          throw new Error(`Unsupported stream format: ${config.format}`);
      }

      this.activeStreams.set(sessionId, streamInfo);
      this.logger.info(`Stream started: ${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to start stream: ${error.message}`);
      throw error;
    }
  }

  private async startHLSStream(streamInfo: StreamInfo): Promise<ChildProcess> {
    const { inputUrl, outputPath, config } = streamInfo;
    const playlistPath = path.join(outputPath, 'playlist.m3u8');
    const segmentPath = path.join(outputPath, 'segment_%03d.ts');

    const ffmpegArgs = [
      '-i', inputUrl,
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-preset', 'fast',
      '-g', '60',
      '-sc_threshold', '0',
      '-f', 'hls',
      '-hls_time', config.segmentDuration.toString(),
      '-hls_list_size', config.playlistSize.toString(),
      '-hls_flags', 'delete_segments',
      '-hls_segment_filename', segmentPath
    ];

    // Add quality-specific settings
    switch (config.quality) {
      case 'low':
        ffmpegArgs.push('-s', '640x480', '-b:v', '500k', '-b:a', '64k');
        break;
      case 'medium':
        ffmpegArgs.push('-s', '1280x720', '-b:v', '1500k', '-b:a', '128k');
        break;
      case 'high':
        ffmpegArgs.push('-s', '1920x1080', '-b:v', '3000k', '-b:a', '192k');
        break;
    }

    // Add speed control for playback
    if (config.speed && config.speed !== 1) {
      ffmpegArgs.push('-filter:v', `setpts=${1/config.speed}*PTS`);
      ffmpegArgs.push('-filter:a', `atempo=${config.speed}`);
    }

    ffmpegArgs.push(playlistPath);

    const process = spawn('ffmpeg', ffmpegArgs);

    process.stdout.on('data', (data) => {
      this.logger.debug(`FFmpeg stdout: ${data}`);
    });

    process.stderr.on('data', (data) => {
      this.logger.debug(`FFmpeg stderr: ${data}`);
    });

    process.on('close', (code) => {
      this.logger.info(`FFmpeg process closed with code ${code} for session ${streamInfo.sessionId}`);
      this.activeStreams.delete(streamInfo.sessionId);
    });

    process.on('error', (error) => {
      this.logger.error(`FFmpeg process error for session ${streamInfo.sessionId}: ${error.message}`);
      this.activeStreams.delete(streamInfo.sessionId);
    });

    return process;
  }

  private async startDASHStream(streamInfo: StreamInfo): Promise<ChildProcess> {
    const { inputUrl, outputPath, config } = streamInfo;
    const manifestPath = path.join(outputPath, 'manifest.mpd');

    const ffmpegArgs = [
      '-i', inputUrl,
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-preset', 'fast',
      '-f', 'dash',
      '-seg_duration', config.segmentDuration.toString(),
      '-window_size', config.playlistSize.toString(),
      '-remove_at_exit', '1'
    ];

    // Add quality-specific settings
    switch (config.quality) {
      case 'low':
        ffmpegArgs.push('-s', '640x480', '-b:v', '500k', '-b:a', '64k');
        break;
      case 'medium':
        ffmpegArgs.push('-s', '1280x720', '-b:v', '1500k', '-b:a', '128k');
        break;
      case 'high':
        ffmpegArgs.push('-s', '1920x1080', '-b:v', '3000k', '-b:a', '192k');
        break;
    }

    ffmpegArgs.push(manifestPath);

    const process = spawn('ffmpeg', ffmpegArgs);

    process.on('close', (code) => {
      this.logger.info(`DASH FFmpeg process closed with code ${code} for session ${streamInfo.sessionId}`);
      this.activeStreams.delete(streamInfo.sessionId);
    });

    process.on('error', (error) => {
      this.logger.error(`DASH FFmpeg process error for session ${streamInfo.sessionId}: ${error.message}`);
      this.activeStreams.delete(streamInfo.sessionId);
    });

    return process;
  }

  private async startRTMPStream(streamInfo: StreamInfo): Promise<ChildProcess> {
    const { inputUrl, config } = streamInfo;
    const rtmpUrl = `rtmp://localhost/stream/${streamInfo.sessionId}`;

    const ffmpegArgs = [
      '-i', inputUrl,
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-preset', 'fast',
      '-f', 'flv',
      rtmpUrl
    ];

    // Add quality-specific settings
    switch (config.quality) {
      case 'low':
        ffmpegArgs.splice(-1, 0, '-s', '640x480', '-b:v', '500k', '-b:a', '64k');
        break;
      case 'medium':
        ffmpegArgs.splice(-1, 0, '-s', '1280x720', '-b:v', '1500k', '-b:a', '128k');
        break;
      case 'high':
        ffmpegArgs.splice(-1, 0, '-s', '1920x1080', '-b:v', '3000k', '-b:a', '192k');
        break;
    }

    const process = spawn('ffmpeg', ffmpegArgs);

    process.on('close', (code) => {
      this.logger.info(`RTMP FFmpeg process closed with code ${code} for session ${streamInfo.sessionId}`);
      this.activeStreams.delete(streamInfo.sessionId);
    });

    process.on('error', (error) => {
      this.logger.error(`RTMP FFmpeg process error for session ${streamInfo.sessionId}: ${error.message}`);
      this.activeStreams.delete(streamInfo.sessionId);
    });

    return process;
  }

  async stopStream(sessionId: string): Promise<void> {
    try {
      const streamInfo = this.activeStreams.get(sessionId);
      if (!streamInfo) {
        throw new Error(`Stream session not found: ${sessionId}`);
      }

      // Kill FFmpeg process
      if (streamInfo.process && !streamInfo.process.killed) {
        streamInfo.process.kill('SIGTERM');
        
        // Force kill if not terminated within 5 seconds
        setTimeout(() => {
          if (streamInfo.process && !streamInfo.process.killed) {
            streamInfo.process.kill('SIGKILL');
          }
        }, 5000);
      }

      // Clean up stream files
      await this.cleanupStreamFiles(streamInfo.outputPath);

      this.activeStreams.delete(sessionId);
      this.logger.info(`Stream stopped: ${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to stop stream: ${error.message}`);
      throw error;
    }
  }

  getStreamUrl(sessionId: string): string {
    const streamInfo = this.activeStreams.get(sessionId);
    if (!streamInfo) {
      throw new Error(`Stream session not found: ${sessionId}`);
    }

    // Update last access time
    streamInfo.lastAccess = new Date();

    switch (streamInfo.config.format) {
      case 'hls':
        return `${this.baseUrl}/streams/${sessionId}/playlist.m3u8`;
      case 'dash':
        return `${this.baseUrl}/streams/${sessionId}/manifest.mpd`;
      case 'rtmp':
        return `rtmp://localhost/stream/${sessionId}`;
      default:
        throw new Error(`Unsupported stream format: ${streamInfo.config.format}`);
    }
  }

  getActiveStreams(): StreamInfo[] {
    return Array.from(this.activeStreams.values());
  }

  async getStreamStats(sessionId: string): Promise<StreamStats> {
    const streamInfo = this.activeStreams.get(sessionId);
    if (!streamInfo) {
      throw new Error(`Stream session not found: ${sessionId}`);
    }

    const stats: StreamStats = {
      sessionId,
      startTime: streamInfo.startTime,
      duration: Date.now() - streamInfo.startTime.getTime(),
      lastAccess: streamInfo.lastAccess,
      isActive: streamInfo.process ? !streamInfo.process.killed : false,
      config: streamInfo.config
    };

    return stats;
  }

  async cleanupInactiveStreams(maxInactiveMinutes = 30): Promise<void> {
    const now = new Date();
    const inactiveThreshold = maxInactiveMinutes * 60 * 1000;

    for (const [sessionId, streamInfo] of this.activeStreams.entries()) {
      const inactiveTime = now.getTime() - streamInfo.lastAccess.getTime();
      
      if (inactiveTime > inactiveThreshold) {
        try {
          await this.stopStream(sessionId);
          this.logger.info(`Cleaned up inactive stream: ${sessionId}`);
        } catch (error) {
          this.logger.warn(`Failed to cleanup inactive stream ${sessionId}: ${error.message}`);
        }
      }
    }
  }

  private async cleanupStreamFiles(outputPath: string): Promise<void> {
    try {
      await fs.rmdir(outputPath, { recursive: true });
    } catch (error) {
      this.logger.warn(`Failed to cleanup stream files: ${error.message}`);
    }
  }

  async generateThumbnail(sessionId: string): Promise<string> {
    try {
      const streamInfo = this.activeStreams.get(sessionId);
      if (!streamInfo) {
        throw new Error(`Stream session not found: ${sessionId}`);
      }

      const thumbnailPath = path.join(streamInfo.outputPath, 'thumbnail.jpg');
      
      const ffmpegArgs = [
        '-i', streamInfo.inputUrl,
        '-vframes', '1',
        '-q:v', '2',
        '-y',
        thumbnailPath
      ];

      return new Promise((resolve, reject) => {
        const process = spawn('ffmpeg', ffmpegArgs);
        
        process.on('close', (code) => {
          if (code === 0) {
            resolve(`${this.baseUrl}/streams/${sessionId}/thumbnail.jpg`);
          } else {
            reject(new Error(`Failed to generate thumbnail, FFmpeg exit code: ${code}`));
          }
        });

        process.on('error', (error) => {
          reject(error);
        });
      });
    } catch (error) {
      this.logger.error(`Failed to generate thumbnail: ${error.message}`);
      throw error;
    }
  }
}

export interface StreamStats {
  sessionId: string;
  startTime: Date;
  duration: number;
  lastAccess: Date;
  isActive: boolean;
  config: StreamConfig;
}