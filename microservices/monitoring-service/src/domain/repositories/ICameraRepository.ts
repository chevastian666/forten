import { Camera, CreateCameraDto, UpdateCameraDto, CameraStatus } from '../entities/Camera';

export interface ICameraRepository {
  create(camera: CreateCameraDto): Promise<Camera>;
  findById(id: string): Promise<Camera | null>;
  findByBuildingId(buildingId: string): Promise<Camera[]>;
  findByStatus(status: CameraStatus): Promise<Camera[]>;
  findByFloor(buildingId: string, floor: number): Promise<Camera[]>;
  findAll(page?: number, limit?: number): Promise<{ cameras: Camera[]; total: number }>;
  update(id: string, updates: UpdateCameraDto): Promise<Camera | null>;
  delete(id: string): Promise<boolean>;
  updateStatus(id: string, status: CameraStatus): Promise<boolean>;
  updateHeartbeat(id: string): Promise<boolean>;
  findOfflineCameras(threshold: number): Promise<Camera[]>; // threshold in minutes
  findByHikCentralId(hikCentralId: string): Promise<Camera | null>;
  bulkUpdateStatus(ids: string[], status: CameraStatus): Promise<boolean>;
}