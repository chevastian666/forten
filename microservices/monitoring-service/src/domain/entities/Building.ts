export interface Building {
  id: string;
  name: string;
  address: string;
  managerId: string;
  floors: number;
  totalCameras: number;
  totalDevices: number;
  status: BuildingStatus;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  configuration: {
    timezone: string;
    workingHours: {
      start: string;
      end: string;
    };
    alertSettings: {
      motion: boolean;
      offline: boolean;
      maintenance: boolean;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

export enum BuildingStatus {
  ACTIVE = 'active',
  MAINTENANCE = 'maintenance',
  INACTIVE = 'inactive'
}

export interface CreateBuildingDto {
  name: string;
  address: string;
  managerId: string;
  floors: number;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  configuration: {
    timezone: string;
    workingHours: {
      start: string;
      end: string;
    };
    alertSettings: {
      motion: boolean;
      offline: boolean;
      maintenance: boolean;
    };
  };
}

export interface UpdateBuildingDto {
  name?: string;
  address?: string;
  floors?: number;
  status?: BuildingStatus;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  configuration?: {
    timezone?: string;
    workingHours?: {
      start: string;
      end: string;
    };
    alertSettings?: {
      motion?: boolean;
      offline?: boolean;
      maintenance?: boolean;
    };
  };
}