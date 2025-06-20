import { Entity } from '../base/Entity';
import { DoorStatus, DoorType, LockType } from '../value-objects/DoorEnums';

export interface DoorProps {
  id?: string;
  name: string;
  code: string;
  description?: string;
  buildingId: string;
  floor: number;
  area: string;
  doorType: DoorType;
  lockType: LockType;
  status: DoorStatus;
  hardwareInfo: {
    manufacturer: string;
    model: string;
    serialNumber?: string;
    firmwareVersion?: string;
    installationDate?: Date;
    lastMaintenanceDate?: Date;
    nextMaintenanceDate?: Date;
  };
  connectionInfo: {
    controllerAddress: string;
    readerAddress?: string;
    qboxIntegration?: {
      deviceId: string;
      endpoint: string;
      credentials?: Record<string, any>;
    };
  };
  securityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  accessMethods: Array<'PIN' | 'CARD' | 'BIOMETRIC' | 'MOBILE' | 'FACIAL'>;
  schedules: Array<{
    name: string;
    type: 'ALWAYS_LOCKED' | 'ALWAYS_UNLOCKED' | 'SCHEDULED';
    days?: string[]; // ['MON', 'TUE', 'WED', etc.]
    timeSlots?: Array<{
      start: string; // HH:mm format
      end: string; // HH:mm format
    }>;
    priority: number;
    active: boolean;
  }>;
  alarms: {
    doorForcedOpen: boolean;
    doorHeldOpen: boolean;
    doorHeldOpenTimeout?: number; // seconds
    antiPassback: boolean;
    antiPassbackTimeout?: number; // minutes
    tamperDetection: boolean;
  };
  emergencySettings: {
    unlockOnFireAlarm: boolean;
    unlockOnPowerFailure: boolean;
    manualOverride: boolean;
    emergencyAccessCodes?: string[];
  };
  features: string[];
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Door extends Entity<DoorProps> {
  get name(): string {
    return this.props.name;
  }

  get code(): string {
    return this.props.code;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get buildingId(): string {
    return this.props.buildingId;
  }

  get floor(): number {
    return this.props.floor;
  }

  get area(): string {
    return this.props.area;
  }

  get doorType(): DoorType {
    return this.props.doorType;
  }

  get lockType(): LockType {
    return this.props.lockType;
  }

  get status(): DoorStatus {
    return this.props.status;
  }

  get hardwareInfo(): DoorProps['hardwareInfo'] {
    return this.props.hardwareInfo;
  }

  get connectionInfo(): DoorProps['connectionInfo'] {
    return this.props.connectionInfo;
  }

  get securityLevel(): DoorProps['securityLevel'] {
    return this.props.securityLevel;
  }

  get accessMethods(): DoorProps['accessMethods'] {
    return this.props.accessMethods;
  }

  get schedules(): DoorProps['schedules'] {
    return this.props.schedules;
  }

  get alarms(): DoorProps['alarms'] {
    return this.props.alarms;
  }

  get emergencySettings(): DoorProps['emergencySettings'] {
    return this.props.emergencySettings;
  }

  get features(): string[] {
    return this.props.features;
  }

  get metadata(): Record<string, any> | undefined {
    return this.props.metadata;
  }

  public static create(props: DoorProps): Door {
    return new Door({
      ...props,
      id: props.id,
      status: props.status || DoorStatus.LOCKED,
      accessMethods: props.accessMethods || ['PIN'],
      schedules: props.schedules || [],
      features: props.features || [],
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date()
    });
  }

  public lock(): void {
    if (this.props.status === DoorStatus.LOCKED) {
      throw new Error('Door is already locked');
    }
    this.props.status = DoorStatus.LOCKED;
    this.props.updatedAt = new Date();
  }

  public unlock(): void {
    if (this.props.status === DoorStatus.UNLOCKED) {
      throw new Error('Door is already unlocked');
    }
    this.props.status = DoorStatus.UNLOCKED;
    this.props.updatedAt = new Date();
  }

  public setOffline(): void {
    this.props.status = DoorStatus.OFFLINE;
    this.props.updatedAt = new Date();
  }

  public setMaintenance(): void {
    this.props.status = DoorStatus.MAINTENANCE;
    this.props.updatedAt = new Date();
  }

  public setEmergency(): void {
    this.props.status = DoorStatus.EMERGENCY;
    this.props.updatedAt = new Date();
  }

  public isAccessible(): boolean {
    return [DoorStatus.LOCKED, DoorStatus.UNLOCKED].includes(this.props.status);
  }

  public supportsAccessMethod(method: DoorProps['accessMethods'][0]): boolean {
    return this.props.accessMethods.includes(method);
  }

  public shouldBeUnlocked(date?: Date): boolean {
    const checkDate = date || new Date();
    
    // Check emergency settings
    if (this.props.status === DoorStatus.EMERGENCY) {
      return this.props.emergencySettings.unlockOnFireAlarm || 
             this.props.emergencySettings.unlockOnPowerFailure;
    }

    // Sort schedules by priority (highest first)
    const activeSchedules = this.props.schedules
      .filter(s => s.active)
      .sort((a, b) => b.priority - a.priority);

    for (const schedule of activeSchedules) {
      if (schedule.type === 'ALWAYS_UNLOCKED') {
        return true;
      }
      
      if (schedule.type === 'ALWAYS_LOCKED') {
        return false;
      }
      
      if (schedule.type === 'SCHEDULED' && this.isInSchedule(checkDate, schedule)) {
        return true;
      }
    }

    return false;
  }

  private isInSchedule(date: Date, schedule: DoorProps['schedules'][0]): boolean {
    if (!schedule.days || !schedule.timeSlots) {
      return false;
    }

    const dayOfWeek = date.toLocaleString('en-US', { weekday: 'short' }).toUpperCase();
    if (!schedule.days.includes(dayOfWeek)) {
      return false;
    }

    const currentTime = date.getHours() * 60 + date.getMinutes();
    
    for (const slot of schedule.timeSlots) {
      const [startHour, startMinute] = slot.start.split(':').map(Number);
      const [endHour, endMinute] = slot.end.split(':').map(Number);
      
      const startTime = startHour * 60 + startMinute;
      const endTime = endHour * 60 + endMinute;
      
      if (currentTime >= startTime && currentTime <= endTime) {
        return true;
      }
    }

    return false;
  }

  public addSchedule(schedule: DoorProps['schedules'][0]): void {
    this.props.schedules.push(schedule);
    this.props.updatedAt = new Date();
  }

  public removeSchedule(scheduleName: string): void {
    this.props.schedules = this.props.schedules.filter(s => s.name !== scheduleName);
    this.props.updatedAt = new Date();
  }

  public updateSchedule(scheduleName: string, updates: Partial<DoorProps['schedules'][0]>): void {
    const scheduleIndex = this.props.schedules.findIndex(s => s.name === scheduleName);
    if (scheduleIndex === -1) {
      throw new Error('Schedule not found');
    }
    
    this.props.schedules[scheduleIndex] = {
      ...this.props.schedules[scheduleIndex],
      ...updates
    };
    this.props.updatedAt = new Date();
  }

  public activateSchedule(scheduleName: string): void {
    const schedule = this.props.schedules.find(s => s.name === scheduleName);
    if (!schedule) {
      throw new Error('Schedule not found');
    }
    schedule.active = true;
    this.props.updatedAt = new Date();
  }

  public deactivateSchedule(scheduleName: string): void {
    const schedule = this.props.schedules.find(s => s.name === scheduleName);
    if (!schedule) {
      throw new Error('Schedule not found');
    }
    schedule.active = false;
    this.props.updatedAt = new Date();
  }

  public updateAlarmSettings(alarms: Partial<DoorProps['alarms']>): void {
    this.props.alarms = {
      ...this.props.alarms,
      ...alarms
    };
    this.props.updatedAt = new Date();
  }

  public updateEmergencySettings(settings: Partial<DoorProps['emergencySettings']>): void {
    this.props.emergencySettings = {
      ...this.props.emergencySettings,
      ...settings
    };
    this.props.updatedAt = new Date();
  }

  public addEmergencyAccessCode(code: string): void {
    if (!this.props.emergencySettings.emergencyAccessCodes) {
      this.props.emergencySettings.emergencyAccessCodes = [];
    }
    if (!this.props.emergencySettings.emergencyAccessCodes.includes(code)) {
      this.props.emergencySettings.emergencyAccessCodes.push(code);
      this.props.updatedAt = new Date();
    }
  }

  public removeEmergencyAccessCode(code: string): void {
    if (this.props.emergencySettings.emergencyAccessCodes) {
      const index = this.props.emergencySettings.emergencyAccessCodes.indexOf(code);
      if (index > -1) {
        this.props.emergencySettings.emergencyAccessCodes.splice(index, 1);
        this.props.updatedAt = new Date();
      }
    }
  }

  public isEmergencyAccessCode(code: string): boolean {
    return this.props.emergencySettings.emergencyAccessCodes?.includes(code) || false;
  }

  public addAccessMethod(method: DoorProps['accessMethods'][0]): void {
    if (!this.props.accessMethods.includes(method)) {
      this.props.accessMethods.push(method);
      this.props.updatedAt = new Date();
    }
  }

  public removeAccessMethod(method: DoorProps['accessMethods'][0]): void {
    const index = this.props.accessMethods.indexOf(method);
    if (index > -1) {
      this.props.accessMethods.splice(index, 1);
      this.props.updatedAt = new Date();
    }
  }

  public updateHardwareInfo(info: Partial<DoorProps['hardwareInfo']>): void {
    this.props.hardwareInfo = {
      ...this.props.hardwareInfo,
      ...info
    };
    this.props.updatedAt = new Date();
  }

  public updateConnectionInfo(info: Partial<DoorProps['connectionInfo']>): void {
    this.props.connectionInfo = {
      ...this.props.connectionInfo,
      ...info
    };
    this.props.updatedAt = new Date();
  }

  public needsMaintenance(): boolean {
    if (!this.props.hardwareInfo.nextMaintenanceDate) {
      return false;
    }
    return new Date() >= this.props.hardwareInfo.nextMaintenanceDate;
  }
}