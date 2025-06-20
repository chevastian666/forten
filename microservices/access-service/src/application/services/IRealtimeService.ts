export interface AccessLogUpdate {
  logId: string;
  buildingId: string;
  doorId: string;
  doorName: string;
  accessMethod: string;
  accessResult: string;
  timestamp: Date;
  entityType: 'user' | 'visitor' | 'unknown';
  entityId?: string;
}

export interface DoorStatusUpdate {
  doorId: string;
  doorName: string;
  buildingId: string;
  status: string;
  controlledBy?: string;
  timestamp: Date;
}

export interface OccupancyUpdate {
  buildingId: string;
  currentOccupancy: number;
  maxOccupancy: number;
  occupancyRate: number;
  timestamp: Date;
}

export interface SecurityAlert {
  alertId: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  buildingId: string;
  doorId?: string;
  message: string;
  details: Record<string, any>;
  timestamp: Date;
}

export interface IRealtimeService {
  // Access monitoring
  sendAccessLog(update: AccessLogUpdate): Promise<void>;
  subscribeToAccessLogs(buildingId: string, callback: (update: AccessLogUpdate) => void): void;
  
  // Door status
  sendDoorStatusUpdate(update: DoorStatusUpdate): Promise<void>;
  subscribeToDoorStatus(buildingId: string, callback: (update: DoorStatusUpdate) => void): void;
  
  // Occupancy tracking
  sendOccupancyUpdate(update: OccupancyUpdate): Promise<void>;
  subscribeToOccupancy(buildingId: string, callback: (update: OccupancyUpdate) => void): void;
  
  // Security alerts
  sendSecurityAlert(alert: SecurityAlert): Promise<void>;
  subscribeToSecurityAlerts(buildingId: string, callback: (alert: SecurityAlert) => void): void;
  
  // Connection management
  disconnect(clientId: string): void;
  getConnectedClients(): Promise<string[]>;
}