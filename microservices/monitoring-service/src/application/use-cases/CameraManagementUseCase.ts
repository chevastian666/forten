import { ICameraRepository } from '../../domain/repositories/ICameraRepository';
import { IEventRepository } from '../../domain/repositories/IEventRepository';
import { Camera, CreateCameraDto, UpdateCameraDto, CameraStatus } from '../../domain/entities/Camera';
import { EventType, EventSeverity } from '../../domain/entities/Event';
import { HikCentralService } from '../../infrastructure/services/HikCentralService';
import { WebSocketService } from '../../infrastructure/websocket/WebSocketService';
import { Logger } from '../../utils/Logger';

export class CameraManagementUseCase {
  constructor(
    private cameraRepository: ICameraRepository,
    private eventRepository: IEventRepository,
    private hikCentralService: HikCentralService,
    private webSocketService: WebSocketService,
    private logger: Logger
  ) {}

  async createCamera(cameraData: CreateCameraDto): Promise<Camera> {
    try {
      // Validate camera connection
      const isReachable = await this.hikCentralService.testCameraConnection(
        cameraData.ipAddress,
        cameraData.port,
        cameraData.username,
        cameraData.password
      );

      if (!isReachable) {
        throw new Error('Camera is not reachable');
      }

      // Create camera in database
      const camera = await this.cameraRepository.create(cameraData);

      // Register camera with HikCentral
      try {
        const hikCentralId = await this.hikCentralService.addCamera({
          name: camera.name,
          ipAddress: camera.ipAddress,
          port: camera.port,
          username: camera.username,
          password: camera.password,
          model: camera.model
        });

        // Update camera with HikCentral ID
        await this.cameraRepository.update(camera.id, { hikCentralId });
        camera.hikCentralId = hikCentralId;
      } catch (error) {
        this.logger.warn(`Failed to register camera with HikCentral: ${error.message}`);
      }

      // Create camera online event
      await this.eventRepository.create({
        buildingId: camera.buildingId,
        cameraId: camera.id,
        type: EventType.CAMERA_ONLINE,
        severity: EventSeverity.LOW,
        title: 'Camera Added',
        description: `Camera ${camera.name} has been added and is online`,
        location: camera.location
      });

      // Notify via WebSocket
      this.webSocketService.emit('camera:added', {
        buildingId: camera.buildingId,
        camera
      });

      this.logger.info(`Camera created: ${camera.id}`);
      return camera;
    } catch (error) {
      this.logger.error(`Failed to create camera: ${error.message}`);
      throw error;
    }
  }

  async updateCamera(id: string, updates: UpdateCameraDto): Promise<Camera | null> {
    try {
      const camera = await this.cameraRepository.findById(id);
      if (!camera) {
        throw new Error('Camera not found');
      }

      // If connection details are being updated, test the connection
      if (updates.ipAddress || updates.port || updates.username || updates.password) {
        const isReachable = await this.hikCentralService.testCameraConnection(
          updates.ipAddress || camera.ipAddress,
          updates.port || camera.port,
          updates.username || camera.username,
          updates.password || camera.password
        );

        if (!isReachable) {
          throw new Error('Updated camera connection is not reachable');
        }
      }

      const updatedCamera = await this.cameraRepository.update(id, updates);
      if (!updatedCamera) {
        throw new Error('Failed to update camera');
      }

      // Update HikCentral if applicable
      if (camera.hikCentralId && (updates.ipAddress || updates.port || updates.username || updates.password)) {
        try {
          await this.hikCentralService.updateCamera(camera.hikCentralId, {
            ipAddress: updates.ipAddress,
            port: updates.port,
            username: updates.username,
            password: updates.password
          });
        } catch (error) {
          this.logger.warn(`Failed to update camera in HikCentral: ${error.message}`);
        }
      }

      // Notify via WebSocket
      this.webSocketService.emit('camera:updated', {
        buildingId: updatedCamera.buildingId,
        camera: updatedCamera
      });

      this.logger.info(`Camera updated: ${id}`);
      return updatedCamera;
    } catch (error) {
      this.logger.error(`Failed to update camera: ${error.message}`);
      throw error;
    }
  }

  async deleteCamera(id: string): Promise<void> {
    try {
      const camera = await this.cameraRepository.findById(id);
      if (!camera) {
        throw new Error('Camera not found');
      }

      // Remove from HikCentral
      if (camera.hikCentralId) {
        try {
          await this.hikCentralService.removeCamera(camera.hikCentralId);
        } catch (error) {
          this.logger.warn(`Failed to remove camera from HikCentral: ${error.message}`);
        }
      }

      // Delete from database
      const deleted = await this.cameraRepository.delete(id);
      if (!deleted) {
        throw new Error('Failed to delete camera');
      }

      // Create camera offline event
      await this.eventRepository.create({
        buildingId: camera.buildingId,
        cameraId: camera.id,
        type: EventType.CAMERA_OFFLINE,
        severity: EventSeverity.MEDIUM,
        title: 'Camera Removed',
        description: `Camera ${camera.name} has been removed`,
        location: camera.location
      });

      // Notify via WebSocket
      this.webSocketService.emit('camera:deleted', {
        buildingId: camera.buildingId,
        cameraId: id
      });

      this.logger.info(`Camera deleted: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete camera: ${error.message}`);
      throw error;
    }
  }

  async getCamerasByBuilding(buildingId: string): Promise<Camera[]> {
    return this.cameraRepository.findByBuildingId(buildingId);
  }

  async getCameraById(id: string): Promise<Camera | null> {
    return this.cameraRepository.findById(id);
  }

  async updateCameraStatus(id: string, status: CameraStatus): Promise<void> {
    try {
      const camera = await this.cameraRepository.findById(id);
      if (!camera) {
        throw new Error('Camera not found');
      }

      const previousStatus = camera.status;
      await this.cameraRepository.updateStatus(id, status);

      // Create status change event if status actually changed
      if (previousStatus !== status) {
        const eventType = status === CameraStatus.ONLINE ? EventType.CAMERA_ONLINE : EventType.CAMERA_OFFLINE;
        const severity = status === CameraStatus.ONLINE ? EventSeverity.LOW : EventSeverity.MEDIUM;

        await this.eventRepository.create({
          buildingId: camera.buildingId,
          cameraId: camera.id,
          type: eventType,
          severity,
          title: `Camera ${status}`,
          description: `Camera ${camera.name} is now ${status}`,
          location: camera.location
        });

        // Notify via WebSocket
        this.webSocketService.emit('camera:status_changed', {
          buildingId: camera.buildingId,
          cameraId: id,
          status,
          previousStatus
        });
      }

      this.logger.info(`Camera status updated: ${id} -> ${status}`);
    } catch (error) {
      this.logger.error(`Failed to update camera status: ${error.message}`);
      throw error;
    }
  }

  async checkCameraHealth(): Promise<void> {
    try {
      const cameras = await this.cameraRepository.findByStatus(CameraStatus.ONLINE);
      
      for (const camera of cameras) {
        try {
          const isOnline = await this.hikCentralService.checkCameraStatus(camera.ipAddress, camera.port);
          
          if (!isOnline && camera.status === CameraStatus.ONLINE) {
            await this.updateCameraStatus(camera.id, CameraStatus.OFFLINE);
          } else if (isOnline && camera.status === CameraStatus.OFFLINE) {
            await this.updateCameraStatus(camera.id, CameraStatus.ONLINE);
            await this.cameraRepository.updateHeartbeat(camera.id);
          } else if (isOnline) {
            await this.cameraRepository.updateHeartbeat(camera.id);
          }
        } catch (error) {
          this.logger.warn(`Failed to check camera health for ${camera.id}: ${error.message}`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to check camera health: ${error.message}`);
    }
  }

  async getStreamUrl(cameraId: string, streamType: 'main' | 'sub' | 'mobile' = 'main'): Promise<string> {
    try {
      const camera = await this.cameraRepository.findById(cameraId);
      if (!camera) {
        throw new Error('Camera not found');
      }

      if (camera.status !== CameraStatus.ONLINE) {
        throw new Error('Camera is not online');
      }

      // Return the appropriate stream URL
      switch (streamType) {
        case 'main':
          return camera.streamUrls.main;
        case 'sub':
          return camera.streamUrls.sub;
        case 'mobile':
          return camera.streamUrls.mobile || camera.streamUrls.sub;
        default:
          return camera.streamUrls.main;
      }
    } catch (error) {
      this.logger.error(`Failed to get stream URL: ${error.message}`);
      throw error;
    }
  }
}