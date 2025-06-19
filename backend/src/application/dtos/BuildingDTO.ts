export interface BuildingDTO {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  status: string;
  contractDate?: string;
  installationDate?: string;
  totalUnits: number;
  totalCameras: number;
  qboxSerial?: string;
  hikCentralId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBuildingDTO {
  name: string;
  address: string;
  city: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  totalUnits?: number;
  totalCameras?: number;
  notes?: string;
}

export interface UpdateBuildingDTO {
  name?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  status?: string;
  contractDate?: string;
  installationDate?: string;
  totalUnits?: number;
  totalCameras?: number;
  qboxSerial?: string;
  hikCentralId?: string;
  notes?: string;
}

export interface BuildingListDTO {
  buildings: BuildingDTO[];
  total: number;
  page: number;
  totalPages: number;
}