export interface HikDevice {
  id: string;
  name: string;
  type: 'camera' | 'nvr' | 'access_control';
  model: string;
  serialNumber: string;
  ipAddress: string;
  status: 'online' | 'offline' | 'error';
  lastHeartbeat: Date;
  capabilities: string[];
  channels?: HikChannel[];
  metadata?: Record<string, any>;
}

export interface HikChannel {
  id: number;
  name: string;
  enabled: boolean;
  streamingCapability: {
    mainStream: StreamProfile;
    subStream: StreamProfile;
  };
}

export interface StreamProfile {
  resolution: string;
  frameRate: number;
  bitRate: number;
  codec: string;
}

export interface HikStream {
  url: string;
  protocol: 'rtsp' | 'hls' | 'webrtc';
  token?: string;
  expires?: Date;
}

export interface HikRecording {
  id: string;
  deviceId: string;
  channelId: number;
  startTime: Date;
  endTime: Date;
  fileSize: number;
  downloadUrl?: string;
  thumbnailUrl?: string;
  events?: RecordingEvent[];
}

export interface RecordingEvent {
  type: 'motion' | 'line_crossing' | 'intrusion' | 'face_detection';
  timestamp: Date;
  confidence: number;
  metadata?: any;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface MotionDetectionConfig {
  enabled: boolean;
  sensitivity: number;
  regions?: DetectionRegion[];
  schedule?: DetectionSchedule;
}

export interface DetectionRegion {
  id: string;
  name: string;
  coordinates: Array<{ x: number; y: number }>;
  sensitivity?: number;
}

export interface DetectionSchedule {
  enabled: boolean;
  timeRanges: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
}

export interface HikEvent {
  id: string;
  deviceId: string;
  channelId?: number;
  type: string;
  subType?: string;
  timestamp: Date;
  description: string;
  imageUrl?: string;
  videoClipUrl?: string;
  metadata?: Record<string, any>;
}

export interface HikAlarm {
  id: string;
  deviceId: string;
  type: 'motion' | 'tamper' | 'disk_full' | 'network_error' | 'video_loss';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
  details: Record<string, any>;
}

export interface HikCentralConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  ssl: boolean;
  apiVersion?: string;
  timeout?: number;
  maxRetries?: number;
  keepAlive?: boolean;
}

export interface HikCentralAuth {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  scope?: string[];
}

export type MotionCallback = (event: HikEvent) => void | Promise<void>;
export type AlarmCallback = (alarm: HikAlarm) => void | Promise<void>;
export type ConnectionCallback = (status: 'connected' | 'disconnected' | 'error', error?: Error) => void;