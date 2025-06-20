export interface Camera {
  id: string;
  buildingId: string;
  name: string;
  model: string;
  ipAddress: string;
  port: number;
  username: string;
  password: string;
  location: string;
  floor: number;
  status: CameraStatus;
  capabilities: CameraCapabilities;
  streamUrls: {
    main: string;
    sub: string;
    mobile?: string;
  };
  recording: {
    enabled: boolean;
    schedule: RecordingSchedule[];
    retention: number; // days
    quality: VideoQuality;
  };
  motionDetection: {
    enabled: boolean;
    sensitivity: number;
    regions: MotionRegion[];
  };
  hikCentralId?: string;
  lastHeartbeat: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum CameraStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  MAINTENANCE = 'maintenance',
  ERROR = 'error'
}

export interface CameraCapabilities {
  ptz: boolean;
  zoom: boolean;
  nightVision: boolean;
  audioRecording: boolean;
  motionDetection: boolean;
  faceRecognition: boolean;
  licenseReading: boolean;
  resolution: string;
  fps: number;
}

export interface RecordingSchedule {
  dayOfWeek: number; // 0-6, Sunday = 0
  startTime: string; // HH:MM
  endTime: string; // HH:MM
}

export enum VideoQuality {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  ULTRA = 'ultra'
}

export interface MotionRegion {
  id: string;
  name: string;
  coordinates: Array<{ x: number; y: number }>;
  sensitivity: number;
}

export interface CreateCameraDto {
  buildingId: string;
  name: string;
  model: string;
  ipAddress: string;
  port: number;
  username: string;
  password: string;
  location: string;
  floor: number;
  capabilities: CameraCapabilities;
  recording?: {
    enabled: boolean;
    schedule?: RecordingSchedule[];
    retention?: number;
    quality?: VideoQuality;
  };
  motionDetection?: {
    enabled: boolean;
    sensitivity?: number;
    regions?: MotionRegion[];
  };
}

export interface UpdateCameraDto {
  name?: string;
  model?: string;
  ipAddress?: string;
  port?: number;
  username?: string;
  password?: string;
  location?: string;
  floor?: number;
  status?: CameraStatus;
  capabilities?: Partial<CameraCapabilities>;
  recording?: Partial<Camera['recording']>;
  motionDetection?: Partial<Camera['motionDetection']>;
}