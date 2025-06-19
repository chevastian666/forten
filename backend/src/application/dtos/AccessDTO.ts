export interface AccessDTO {
  id: string;
  buildingId: string;
  pin: string;
  name: string;
  phone?: string;
  type: string;
  validFrom: string;
  validUntil: string;
  maxUses: number;
  currentUses: number;
  isActive: boolean;
  createdBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  building?: {
    id: string;
    name: string;
  };
}

export interface CreateAccessDTO {
  buildingId: string;
  name: string;
  phone?: string;
  type: string;
  validUntil: string;
  maxUses?: number;
  notes?: string;
}

export interface UpdateAccessDTO {
  name?: string;
  phone?: string;
  type?: string;
  validUntil?: string;
  maxUses?: number;
  isActive?: boolean;
  notes?: string;
}

export interface ValidateAccessDTO {
  pin: string;
  buildingId?: string;
}

export interface AccessValidationResultDTO {
  valid: boolean;
  access?: {
    name: string;
    type: string;
    remainingUses: number;
  };
  error?: string;
}

export interface AccessListDTO {
  accesses: AccessDTO[];
  total: number;
  page: number;
  totalPages: number;
}