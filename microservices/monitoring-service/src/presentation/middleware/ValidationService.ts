import Joi from 'joi';
import { CreateBuildingDto, UpdateBuildingDto } from '../../domain/entities/Building';
import { CreateCameraDto, UpdateCameraDto } from '../../domain/entities/Camera';
import { CreateEventDto, UpdateEventDto } from '../../domain/entities/Event';
import { CreateAlertDto, UpdateAlertDto } from '../../domain/entities/Alert';
import { CreateDeviceDto, UpdateDeviceDto } from '../../domain/entities/Device';

export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
}

export class ValidationService {
  // Building validation schemas
  private createBuildingSchema = Joi.object({
    name: Joi.string().required().min(1).max(255),
    address: Joi.string().required().min(1).max(500),
    managerId: Joi.string().uuid().required(),
    floors: Joi.number().integer().min(1).max(200).required(),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required()
    }).optional(),
    configuration: Joi.object({
      timezone: Joi.string().required(),
      workingHours: Joi.object({
        start: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
        end: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
      }).required(),
      alertSettings: Joi.object({
        motion: Joi.boolean().required(),
        offline: Joi.boolean().required(),
        maintenance: Joi.boolean().required()
      }).required()
    }).required()
  });

  private updateBuildingSchema = Joi.object({
    name: Joi.string().min(1).max(255),
    address: Joi.string().min(1).max(500),
    floors: Joi.number().integer().min(1).max(200),
    status: Joi.string().valid('active', 'maintenance', 'inactive'),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required()
    }),
    configuration: Joi.object({
      timezone: Joi.string(),
      workingHours: Joi.object({
        start: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        end: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      }),
      alertSettings: Joi.object({
        motion: Joi.boolean(),
        offline: Joi.boolean(),
        maintenance: Joi.boolean()
      })
    })
  });

  // Camera validation schemas
  private createCameraSchema = Joi.object({
    buildingId: Joi.string().uuid().required(),
    name: Joi.string().required().min(1).max(255),
    model: Joi.string().required().min(1).max(100),
    ipAddress: Joi.string().ip().required(),
    port: Joi.number().integer().min(1).max(65535).required(),
    username: Joi.string().required().min(1).max(100),
    password: Joi.string().required().min(1).max(100),
    location: Joi.string().required().min(1).max(255),
    floor: Joi.number().integer().min(0).max(200).required(),
    capabilities: Joi.object({
      ptz: Joi.boolean().required(),
      zoom: Joi.boolean().required(),
      nightVision: Joi.boolean().required(),
      audioRecording: Joi.boolean().required(),
      motionDetection: Joi.boolean().required(),
      faceRecognition: Joi.boolean().required(),
      licenseReading: Joi.boolean().required(),
      resolution: Joi.string().required(),
      fps: Joi.number().integer().min(1).max(60).required()
    }).required(),
    recording: Joi.object({
      enabled: Joi.boolean(),
      schedule: Joi.array().items(Joi.object({
        dayOfWeek: Joi.number().integer().min(0).max(6),
        startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      })),
      retention: Joi.number().integer().min(1).max(365),
      quality: Joi.string().valid('low', 'medium', 'high', 'ultra')
    }),
    motionDetection: Joi.object({
      enabled: Joi.boolean(),
      sensitivity: Joi.number().integer().min(0).max(100),
      regions: Joi.array().items(Joi.object({
        id: Joi.string(),
        name: Joi.string(),
        coordinates: Joi.array().items(Joi.object({
          x: Joi.number(),
          y: Joi.number()
        })),
        sensitivity: Joi.number().integer().min(0).max(100)
      }))
    })
  });

  private updateCameraSchema = Joi.object({
    name: Joi.string().min(1).max(255),
    model: Joi.string().min(1).max(100),
    ipAddress: Joi.string().ip(),
    port: Joi.number().integer().min(1).max(65535),
    username: Joi.string().min(1).max(100),
    password: Joi.string().min(1).max(100),
    location: Joi.string().min(1).max(255),
    floor: Joi.number().integer().min(0).max(200),
    status: Joi.string().valid('online', 'offline', 'maintenance', 'error'),
    capabilities: Joi.object({
      ptz: Joi.boolean(),
      zoom: Joi.boolean(),
      nightVision: Joi.boolean(),
      audioRecording: Joi.boolean(),
      motionDetection: Joi.boolean(),
      faceRecognition: Joi.boolean(),
      licenseReading: Joi.boolean(),
      resolution: Joi.string(),
      fps: Joi.number().integer().min(1).max(60)
    }),
    recording: Joi.object({
      enabled: Joi.boolean(),
      schedule: Joi.array().items(Joi.object({
        dayOfWeek: Joi.number().integer().min(0).max(6),
        startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      })),
      retention: Joi.number().integer().min(1).max(365),
      quality: Joi.string().valid('low', 'medium', 'high', 'ultra')
    }),
    motionDetection: Joi.object({
      enabled: Joi.boolean(),
      sensitivity: Joi.number().integer().min(0).max(100),
      regions: Joi.array().items(Joi.object({
        id: Joi.string(),
        name: Joi.string(),
        coordinates: Joi.array().items(Joi.object({
          x: Joi.number(),
          y: Joi.number()
        })),
        sensitivity: Joi.number().integer().min(0).max(100)
      }))
    })
  });

  // Event validation schemas
  private createEventSchema = Joi.object({
    buildingId: Joi.string().uuid().required(),
    cameraId: Joi.string().uuid(),
    deviceId: Joi.string().uuid(),
    type: Joi.string().valid(
      'motion_detected', 'camera_offline', 'camera_online', 'recording_failed',
      'device_offline', 'device_online', 'door_opened', 'door_closed',
      'access_granted', 'access_denied', 'alarm_triggered', 'system_error',
      'maintenance_required', 'face_recognized', 'license_plate_read'
    ).required(),
    severity: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
    title: Joi.string().required().min(1).max(255),
    description: Joi.string().required().min(1).max(1000),
    metadata: Joi.object(),
    imageUrl: Joi.string().uri(),
    videoUrl: Joi.string().uri(),
    location: Joi.string().required().min(1).max(255)
  });

  private updateEventSchema = Joi.object({
    acknowledged: Joi.boolean(),
    acknowledgedBy: Joi.string().uuid(),
    resolved: Joi.boolean(),
    resolvedBy: Joi.string().uuid(),
    metadata: Joi.object()
  });

  // Alert validation schemas
  private createAlertSchema = Joi.object({
    buildingId: Joi.string().uuid().required(),
    eventId: Joi.string().uuid().required(),
    recipientId: Joi.string().uuid().required(),
    type: Joi.string().valid('motion', 'offline', 'maintenance', 'security', 'system', 'emergency').required(),
    method: Joi.string().valid('email', 'sms', 'push', 'webhook', 'in_app').required(),
    title: Joi.string().required().min(1).max(255),
    message: Joi.string().required().min(1).max(1000),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').required(),
    scheduledAt: Joi.date(),
    metadata: Joi.object()
  });

  private updateAlertSchema = Joi.object({
    status: Joi.string().valid('pending', 'sending', 'sent', 'delivered', 'read', 'failed', 'cancelled'),
    sentAt: Joi.date(),
    deliveredAt: Joi.date(),
    readAt: Joi.date(),
    failedAt: Joi.date(),
    failureReason: Joi.string().max(500),
    retryCount: Joi.number().integer().min(0),
    metadata: Joi.object()
  });

  // Device validation schemas
  private createDeviceSchema = Joi.object({
    buildingId: Joi.string().uuid().required(),
    name: Joi.string().required().min(1).max(255),
    type: Joi.string().valid(
      'door_controller', 'access_reader', 'alarm_panel', 'motion_sensor',
      'smoke_detector', 'temperature_sensor', 'elevator_controller',
      'lighting_controller', 'hvac_controller', 'intercom', 'barrier_gate'
    ).required(),
    model: Joi.string().required().min(1).max(100),
    serialNumber: Joi.string().required().min(1).max(100),
    ipAddress: Joi.string().ip(),
    port: Joi.number().integer().min(1).max(65535),
    location: Joi.string().required().min(1).max(255),
    floor: Joi.number().integer().min(0).max(200).required(),
    configuration: Joi.object(),
    capabilities: Joi.array().items(Joi.string()),
    qBoxId: Joi.string(),
    hikCentralId: Joi.string()
  });

  private updateDeviceSchema = Joi.object({
    name: Joi.string().min(1).max(255),
    model: Joi.string().min(1).max(100),
    ipAddress: Joi.string().ip(),
    port: Joi.number().integer().min(1).max(65535),
    location: Joi.string().min(1).max(255),
    floor: Joi.number().integer().min(0).max(200),
    status: Joi.string().valid('online', 'offline', 'maintenance', 'error', 'disabled'),
    configuration: Joi.object(),
    capabilities: Joi.array().items(Joi.string()),
    lastMaintenance: Joi.date(),
    nextMaintenance: Joi.date()
  });

  // Validation methods
  validateCreateBuilding(data: CreateBuildingDto): ValidationResult {
    return this.validate(this.createBuildingSchema, data);
  }

  validateUpdateBuilding(data: UpdateBuildingDto): ValidationResult {
    return this.validate(this.updateBuildingSchema, data);
  }

  validateCreateCamera(data: CreateCameraDto): ValidationResult {
    return this.validate(this.createCameraSchema, data);
  }

  validateUpdateCamera(data: UpdateCameraDto): ValidationResult {
    return this.validate(this.updateCameraSchema, data);
  }

  validateCreateEvent(data: CreateEventDto): ValidationResult {
    return this.validate(this.createEventSchema, data);
  }

  validateUpdateEvent(data: UpdateEventDto): ValidationResult {
    return this.validate(this.updateEventSchema, data);
  }

  validateCreateAlert(data: CreateAlertDto): ValidationResult {
    return this.validate(this.createAlertSchema, data);
  }

  validateUpdateAlert(data: UpdateAlertDto): ValidationResult {
    return this.validate(this.updateAlertSchema, data);
  }

  validateCreateDevice(data: CreateDeviceDto): ValidationResult {
    return this.validate(this.createDeviceSchema, data);
  }

  validateUpdateDevice(data: UpdateDeviceDto): ValidationResult {
    return this.validate(this.updateDeviceSchema, data);
  }

  private validate(schema: Joi.ObjectSchema, data: any): ValidationResult {
    const { error } = schema.validate(data, { abortEarly: false });
    
    if (error) {
      return {
        isValid: false,
        errors: error.details.map(detail => detail.message)
      };
    }

    return { isValid: true };
  }

  // Custom validation for IP addresses and ports
  validateIPAddress(ip: string): boolean {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  }

  validatePort(port: number): boolean {
    return port >= 1 && port <= 65535;
  }

  validateTimeFormat(time: string): boolean {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  validateUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validateURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}