import axios, { AxiosInstance } from 'axios';
import { Logger } from '../../utils/Logger';
import { PTZCommand, Recording } from '../../application/use-cases/StreamingUseCase';

export interface HikCentralConfig {
  baseUrl: string;
  username: string;
  password: string;
  timeout: number;
}

export interface CameraData {
  name: string;
  ipAddress: string;
  port: number;
  username: string;
  password: string;
  model: string;
}

export interface CameraUpdateData {
  ipAddress?: string;
  port?: number;
  username?: string;
  password?: string;
}

export class HikCentralService {
  private client: AxiosInstance;
  private accessToken?: string;
  private tokenExpiresAt?: Date;

  constructor(
    private config: HikCentralConfig,
    private logger: Logger
  ) {
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for authentication
    this.client.interceptors.request.use(
      async (config) => {
        await this.ensureAuthenticated();
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired, try to refresh
          this.accessToken = undefined;
          this.tokenExpiresAt = undefined;
          
          // Retry the original request
          return this.client.request(error.config);
        }
        return Promise.reject(error);
      }
    );
  }

  private async ensureAuthenticated(): Promise<void> {
    if (this.accessToken && this.tokenExpiresAt && this.tokenExpiresAt > new Date()) {
      return;
    }

    try {
      const response = await axios.post(`${this.config.baseUrl}/oauth/token`, {
        grant_type: 'password',
        username: this.config.username,
        password: this.config.password
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiresAt = new Date(Date.now() + (response.data.expires_in * 1000));
      
      this.logger.info('HikCentral authentication successful');
    } catch (error) {
      this.logger.error(`HikCentral authentication failed: ${error.message}`);
      throw new Error('Failed to authenticate with HikCentral');
    }
  }

  async testCameraConnection(ipAddress: string, port: number, username: string, password: string): Promise<boolean> {
    try {
      const response = await this.client.post('/api/v1/cameras/test', {
        ipAddress,
        port,
        username,
        password
      });

      return response.data.success;
    } catch (error) {
      this.logger.warn(`Camera connection test failed: ${error.message}`);
      return false;
    }
  }

  async addCamera(cameraData: CameraData): Promise<string> {
    try {
      const response = await this.client.post('/api/v1/cameras', {
        name: cameraData.name,
        ip: cameraData.ipAddress,
        port: cameraData.port,
        username: cameraData.username,
        password: cameraData.password,
        model: cameraData.model,
        protocol: 'ONVIF'
      });

      this.logger.info(`Camera added to HikCentral: ${response.data.id}`);
      return response.data.id;
    } catch (error) {
      this.logger.error(`Failed to add camera to HikCentral: ${error.message}`);
      throw error;
    }
  }

  async updateCamera(hikCentralId: string, updates: CameraUpdateData): Promise<void> {
    try {
      await this.client.put(`/api/v1/cameras/${hikCentralId}`, {
        ip: updates.ipAddress,
        port: updates.port,
        username: updates.username,
        password: updates.password
      });

      this.logger.info(`Camera updated in HikCentral: ${hikCentralId}`);
    } catch (error) {
      this.logger.error(`Failed to update camera in HikCentral: ${error.message}`);
      throw error;
    }
  }

  async removeCamera(hikCentralId: string): Promise<void> {
    try {
      await this.client.delete(`/api/v1/cameras/${hikCentralId}`);
      this.logger.info(`Camera removed from HikCentral: ${hikCentralId}`);
    } catch (error) {
      this.logger.error(`Failed to remove camera from HikCentral: ${error.message}`);
      throw error;
    }
  }

  async checkCameraStatus(ipAddress: string, port: number): Promise<boolean> {
    try {
      const response = await this.client.get(`/api/v1/cameras/ping`, {
        params: { ip: ipAddress, port }
      });

      return response.data.online;
    } catch (error) {
      this.logger.warn(`Failed to check camera status: ${error.message}`);
      return false;
    }
  }

  async getLiveStreamUrl(hikCentralId: string, quality: 'low' | 'medium' | 'high'): Promise<string> {
    try {
      const response = await this.client.get(`/api/v1/cameras/${hikCentralId}/live`, {
        params: { quality }
      });

      return response.data.streamUrl;
    } catch (error) {
      this.logger.error(`Failed to get live stream URL: ${error.message}`);
      throw error;
    }
  }

  async getPlaybackStreamUrl(
    hikCentralId: string,
    startTime: Date,
    endTime: Date,
    quality: 'low' | 'medium' | 'high'
  ): Promise<string> {
    try {
      const response = await this.client.get(`/api/v1/cameras/${hikCentralId}/playback`, {
        params: {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          quality
        }
      });

      return response.data.streamUrl;
    } catch (error) {
      this.logger.error(`Failed to get playback stream URL: ${error.message}`);
      throw error;
    }
  }

  async captureSnapshot(hikCentralId: string): Promise<string> {
    try {
      const response = await this.client.post(`/api/v1/cameras/${hikCentralId}/snapshot`);
      return response.data.snapshotUrl;
    } catch (error) {
      this.logger.error(`Failed to capture snapshot: ${error.message}`);
      throw error;
    }
  }

  async controlPTZ(hikCentralId: string, command: PTZCommand): Promise<void> {
    try {
      await this.client.post(`/api/v1/cameras/${hikCentralId}/ptz`, {
        action: command.action,
        direction: command.direction,
        speed: command.speed,
        presetId: command.presetId
      });

      this.logger.info(`PTZ command sent: ${command.action} for camera ${hikCentralId}`);
    } catch (error) {
      this.logger.error(`Failed to control PTZ: ${error.message}`);
      throw error;
    }
  }

  async getRecordings(hikCentralId: string, startTime: Date, endTime: Date): Promise<Recording[]> {
    try {
      const response = await this.client.get(`/api/v1/cameras/${hikCentralId}/recordings`, {
        params: {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        }
      });

      return response.data.recordings.map((record: any) => ({
        id: record.id,
        cameraId: hikCentralId,
        startTime: new Date(record.startTime),
        endTime: new Date(record.endTime),
        duration: record.duration,
        size: record.size,
        type: record.type,
        quality: record.quality,
        downloadUrl: record.downloadUrl
      }));
    } catch (error) {
      this.logger.error(`Failed to get recordings: ${error.message}`);
      throw error;
    }
  }

  async getRecordingDownloadUrl(recordingId: string): Promise<string> {
    try {
      const response = await this.client.get(`/api/v1/recordings/${recordingId}/download`);
      return response.data.downloadUrl;
    } catch (error) {
      this.logger.error(`Failed to get recording download URL: ${error.message}`);
      throw error;
    }
  }

  async startRecording(hikCentralId: string, duration?: number): Promise<string> {
    try {
      const response = await this.client.post(`/api/v1/cameras/${hikCentralId}/record`, {
        duration
      });

      return response.data.recordingId;
    } catch (error) {
      this.logger.error(`Failed to start recording: ${error.message}`);
      throw error;
    }
  }

  async stopRecording(recordingId: string): Promise<void> {
    try {
      await this.client.post(`/api/v1/recordings/${recordingId}/stop`);
      this.logger.info(`Recording stopped: ${recordingId}`);
    } catch (error) {
      this.logger.error(`Failed to stop recording: ${error.message}`);
      throw error;
    }
  }

  async getDeviceStatus(deviceId: string): Promise<any> {
    try {
      const response = await this.client.get(`/api/v1/devices/${deviceId}/status`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get device status: ${error.message}`);
      throw error;
    }
  }

  async getSystemHealth(): Promise<any> {
    try {
      const response = await this.client.get('/api/v1/system/health');
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get system health: ${error.message}`);
      throw error;
    }
  }
}