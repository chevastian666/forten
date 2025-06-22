import { Device, CreateDeviceDto, UpdateDeviceDto, DeviceFilter, DeviceStatus, DeviceType, DeviceHealth } from '../entities/Device';

export interface IDeviceRepository {
  create(device: CreateDeviceDto): Promise<Device>;
  findById(id: string): Promise<Device | null>;
  findByBuildingId(buildingId: string): Promise<Device[]>;
  findByType(type: DeviceType, buildingId?: string): Promise<Device[]>;
  findByStatus(status: DeviceStatus): Promise<Device[]>;
  findByFloor(buildingId: string, floor: number): Promise<Device[]>;
  findByFilter(filter: DeviceFilter, page?: number, limit?: number): Promise<{ devices: Device[]; total: number }>;
  findAll(page?: number, limit?: number): Promise<{ devices: Device[]; total: number }>;
  update(id: string, updates: UpdateDeviceDto): Promise<Device | null>;
  updateStatus(id: string, status: DeviceStatus): Promise<boolean>;
  updateHealth(id: string, health: DeviceHealth): Promise<boolean>;
  updateHeartbeat(id: string): Promise<boolean>;
  delete(id: string): Promise<boolean>;
  findOfflineDevices(threshold: number): Promise<Device[]>; // threshold in minutes
  findDevicesNeedingMaintenance(): Promise<Device[]>;
  findByQBoxId(qBoxId: string): Promise<Device | null>;
  findByHikCentralId(hikCentralId: string): Promise<Device | null>;
  bulkUpdateStatus(ids: string[], status: DeviceStatus): Promise<boolean>;
  getDeviceStats(buildingId: string): Promise<{
    total: number;
    byType: Record<DeviceType, number>;
    byStatus: Record<DeviceStatus, number>;
    averageHealth: number;
    maintenanceRequired: number;
  }>;
}