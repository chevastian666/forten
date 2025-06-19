export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'supervisor' | 'operator' | 'technician';
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Building {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  status: 'prospect' | 'quoting' | 'contract' | 'active' | 'inactive';
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

export interface Event {
  id: string;
  buildingId: string;
  userId?: string;
  type: 'door_open' | 'door_close' | 'visitor_call' | 'resident_call' | 
        'access_granted' | 'access_denied' | 'camera_view' | 'alarm' | 
        'maintenance' | 'system';
  description: string;
  metadata?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
  Building?: Building;
  User?: User;
}

export interface Access {
  id: string;
  buildingId: string;
  pin: string;
  name: string;
  phone?: string;
  type: 'visitor' | 'temporary' | 'service' | 'emergency';
  validFrom: string;
  validUntil: string;
  maxUses: number;
  currentUses: number;
  isActive: boolean;
  createdBy?: string;
  notes?: string;
  createdAt: string;
  Building?: Building;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

export interface ApiError {
  error: string;
  details?: any;
}