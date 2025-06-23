export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'supervisor' | 'operator' | 'technician';
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
  securityPersonnel?: number;
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
  type: 'security' | 'maintenance' | 'access' | 'system' | 'emergency';
  title: string;
  description: string;
  metadata?: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'critical';
  severity: 'low' | 'medium' | 'high';
  status: 'pending' | 'resolved';
  timestamp: string;
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
  updatedAt: string;
  Building?: Building;
  User?: User;
}

export interface Access {
  id: string;
  buildingId: string;
  visitorName: string;
  visitorDocument: string;
  unitNumber: string;
  pin: string;
  validFrom: string;
  validUntil: string;
  used: boolean;
  usedAt?: string;
  createdAt: string;
  updatedAt: string;
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