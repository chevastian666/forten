import { Request, Response } from 'express';
import { CameraManagementUseCase } from '../../application/use-cases/CameraManagementUseCase';
import { StreamingUseCase } from '../../application/use-cases/StreamingUseCase';
import { CreateCameraDto, UpdateCameraDto, CameraStatus } from '../../domain/entities/Camera';
import { ValidationService } from '../middleware/ValidationService';
import { Logger } from '../../utils/Logger';

export class CameraController {
  constructor(
    private cameraManagementUseCase: CameraManagementUseCase,
    private streamingUseCase: StreamingUseCase,
    private validationService: ValidationService,
    private logger: Logger
  ) {}

  async createCamera(req: Request, res: Response): Promise<void> {
    try {
      const cameraData: CreateCameraDto = req.body;

      // Validate input
      const validationResult = this.validationService.validateCreateCamera(cameraData);
      if (!validationResult.isValid) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validationResult.errors
        });
        return;
      }

      const camera = await this.cameraManagementUseCase.createCamera(cameraData);

      this.logger.info(`Camera created via API: ${camera.id}`);
      res.status(201).json({
        success: true,
        data: camera
      });
    } catch (error) {
      this.logger.error(`Failed to create camera: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to create camera',
        error: error.message
      });
    }
  }

  async getCamera(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const camera = await this.cameraManagementUseCase.getCameraById(id);
      if (!camera) {
        res.status(404).json({
          success: false,
          message: 'Camera not found'
        });
        return;
      }

      res.json({
        success: true,
        data: camera
      });
    } catch (error) {
      this.logger.error(`Failed to get camera: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to get camera',
        error: error.message
      });
    }
  }

  async getCameras(req: Request, res: Response): Promise<void> {
    try {
      const buildingId = req.query.buildingId as string;

      if (!buildingId) {
        res.status(400).json({
          success: false,
          message: 'Building ID is required'
        });
        return;
      }

      const cameras = await this.cameraManagementUseCase.getCamerasByBuilding(buildingId);

      res.json({
        success: true,
        data: cameras
      });
    } catch (error) {
      this.logger.error(`Failed to get cameras: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to get cameras',
        error: error.message
      });
    }
  }

  async updateCamera(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates: UpdateCameraDto = req.body;

      // Validate input
      const validationResult = this.validationService.validateUpdateCamera(updates);
      if (!validationResult.isValid) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validationResult.errors
        });
        return;
      }

      const camera = await this.cameraManagementUseCase.updateCamera(id, updates);
      if (!camera) {
        res.status(404).json({
          success: false,
          message: 'Camera not found'
        });
        return;
      }

      this.logger.info(`Camera updated via API: ${id}`);
      res.json({
        success: true,
        data: camera
      });
    } catch (error) {
      this.logger.error(`Failed to update camera: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to update camera',
        error: error.message
      });
    }
  }

  async deleteCamera(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await this.cameraManagementUseCase.deleteCamera(id);

      this.logger.info(`Camera deleted via API: ${id}`);
      res.json({
        success: true,
        message: 'Camera deleted successfully'
      });
    } catch (error) {
      this.logger.error(`Failed to delete camera: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to delete camera',
        error: error.message
      });
    }
  }

  async updateCameraStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!Object.values(CameraStatus).includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Invalid camera status'
        });
        return;
      }

      await this.cameraManagementUseCase.updateCameraStatus(id, status);

      this.logger.info(`Camera status updated via API: ${id} -> ${status}`);
      res.json({
        success: true,
        message: 'Camera status updated successfully'
      });
    } catch (error) {
      this.logger.error(`Failed to update camera status: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to update camera status',
        error: error.message
      });
    }
  }

  async startLiveStream(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { quality = 'medium' } = req.body;
      const userId = req.user?.id; // Assuming user is attached by auth middleware

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      const session = await this.streamingUseCase.startLiveStream(id, userId, quality);

      res.json({
        success: true,
        data: {
          sessionId: session.id,
          streamUrl: await this.streamingUseCase.getStreamUrl(session.id)
        }
      });
    } catch (error) {
      this.logger.error(`Failed to start live stream: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to start live stream',
        error: error.message
      });
    }
  }

  async startPlaybackStream(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { startTime, endTime, speed = 1, quality = 'medium' } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      if (!startTime || !endTime) {
        res.status(400).json({
          success: false,
          message: 'Start time and end time are required'
        });
        return;
      }

      const session = await this.streamingUseCase.startPlaybackStream(id, userId, {
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        speed,
        quality
      });

      res.json({
        success: true,
        data: {
          sessionId: session.id,
          streamUrl: await this.streamingUseCase.getStreamUrl(session.id)
        }
      });
    } catch (error) {
      this.logger.error(`Failed to start playback stream: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to start playback stream',
        error: error.message
      });
    }
  }

  async stopStream(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      await this.streamingUseCase.stopStream(sessionId);

      res.json({
        success: true,
        message: 'Stream stopped successfully'
      });
    } catch (error) {
      this.logger.error(`Failed to stop stream: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to stop stream',
        error: error.message
      });
    }
  }

  async captureSnapshot(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      const snapshotUrl = await this.streamingUseCase.captureSnapshot(id, userId);

      res.json({
        success: true,
        data: {
          snapshotUrl
        }
      });
    } catch (error) {
      this.logger.error(`Failed to capture snapshot: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to capture snapshot',
        error: error.message
      });
    }
  }

  async controlPTZ(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const command = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      await this.streamingUseCase.controlPTZ(id, userId, command);

      res.json({
        success: true,
        message: 'PTZ command sent successfully'
      });
    } catch (error) {
      this.logger.error(`Failed to control PTZ: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to control PTZ',
        error: error.message
      });
    }
  }

  async getRecordings(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { startTime, endTime } = req.query;

      if (!startTime || !endTime) {
        res.status(400).json({
          success: false,
          message: 'Start time and end time are required'
        });
        return;
      }

      const recordings = await this.streamingUseCase.getRecordings(
        id,
        new Date(startTime as string),
        new Date(endTime as string)
      );

      res.json({
        success: true,
        data: recordings
      });
    } catch (error) {
      this.logger.error(`Failed to get recordings: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to get recordings',
        error: error.message
      });
    }
  }

  async downloadRecording(req: Request, res: Response): Promise<void> {
    try {
      const { recordingId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      const downloadUrl = await this.streamingUseCase.downloadRecording(recordingId, userId);

      res.json({
        success: true,
        data: {
          downloadUrl
        }
      });
    } catch (error) {
      this.logger.error(`Failed to download recording: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to download recording',
        error: error.message
      });
    }
  }

  async getActiveStreams(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const streams = await this.streamingUseCase.getActiveStreams(userId);

      res.json({
        success: true,
        data: streams
      });
    } catch (error) {
      this.logger.error(`Failed to get active streams: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to get active streams',
        error: error.message
      });
    }
  }
}