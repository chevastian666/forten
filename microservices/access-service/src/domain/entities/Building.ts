import { Entity } from '../base/Entity';
import { BuildingStatus } from '../value-objects/BuildingEnums';
import { Address } from '../value-objects/Address';
import { TimeZone } from '../value-objects/TimeZone';

export interface BuildingProps {
  id?: string;
  name: string;
  code: string;
  description?: string;
  address: Address;
  timezone: TimeZone;
  status: BuildingStatus;
  floors: number;
  totalArea?: number; // in square meters
  securityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  accessControlSystem: {
    type: string;
    vendor: string;
    version?: string;
    apiEndpoint?: string;
  };
  operatingHours: {
    [key: string]: { // day of week
      open: string; // HH:mm format
      close: string; // HH:mm format
      closed?: boolean;
    };
  };
  specialDates: Array<{
    date: string; // YYYY-MM-DD
    type: 'HOLIDAY' | 'SPECIAL_HOURS' | 'CLOSED';
    hours?: {
      open: string;
      close: string;
    };
    description?: string;
  }>;
  emergencyContacts: Array<{
    name: string;
    role: string;
    phone: string;
    email?: string;
    priority: number;
  }>;
  facilities: string[];
  parkingSpaces?: number;
  visitorParkingSpaces?: number;
  maxOccupancy?: number;
  currentOccupancy?: number;
  features: string[];
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Building extends Entity<BuildingProps> {
  get name(): string {
    return this.props.name;
  }

  get code(): string {
    return this.props.code;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get address(): Address {
    return this.props.address;
  }

  get timezone(): TimeZone {
    return this.props.timezone;
  }

  get status(): BuildingStatus {
    return this.props.status;
  }

  get floors(): number {
    return this.props.floors;
  }

  get totalArea(): number | undefined {
    return this.props.totalArea;
  }

  get securityLevel(): BuildingProps['securityLevel'] {
    return this.props.securityLevel;
  }

  get accessControlSystem(): BuildingProps['accessControlSystem'] {
    return this.props.accessControlSystem;
  }

  get operatingHours(): BuildingProps['operatingHours'] {
    return this.props.operatingHours;
  }

  get specialDates(): BuildingProps['specialDates'] {
    return this.props.specialDates;
  }

  get emergencyContacts(): BuildingProps['emergencyContacts'] {
    return this.props.emergencyContacts;
  }

  get facilities(): string[] {
    return this.props.facilities;
  }

  get parkingSpaces(): number | undefined {
    return this.props.parkingSpaces;
  }

  get visitorParkingSpaces(): number | undefined {
    return this.props.visitorParkingSpaces;
  }

  get maxOccupancy(): number | undefined {
    return this.props.maxOccupancy;
  }

  get currentOccupancy(): number | undefined {
    return this.props.currentOccupancy;
  }

  get features(): string[] {
    return this.props.features;
  }

  get metadata(): Record<string, any> | undefined {
    return this.props.metadata;
  }

  public static create(props: BuildingProps): Building {
    return new Building({
      ...props,
      id: props.id,
      status: props.status || BuildingStatus.ACTIVE,
      facilities: props.facilities || [],
      features: props.features || [],
      specialDates: props.specialDates || [],
      emergencyContacts: props.emergencyContacts || [],
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date()
    });
  }

  public activate(): void {
    if (this.props.status === BuildingStatus.ACTIVE) {
      throw new Error('Building is already active');
    }
    this.props.status = BuildingStatus.ACTIVE;
    this.props.updatedAt = new Date();
  }

  public deactivate(): void {
    if (this.props.status === BuildingStatus.INACTIVE) {
      throw new Error('Building is already inactive');
    }
    this.props.status = BuildingStatus.INACTIVE;
    this.props.updatedAt = new Date();
  }

  public setMaintenance(inMaintenance: boolean): void {
    this.props.status = inMaintenance ? BuildingStatus.MAINTENANCE : BuildingStatus.ACTIVE;
    this.props.updatedAt = new Date();
  }

  public setEmergency(inEmergency: boolean): void {
    this.props.status = inEmergency ? BuildingStatus.EMERGENCY : BuildingStatus.ACTIVE;
    this.props.updatedAt = new Date();
  }

  public isOpen(date?: Date): boolean {
    const checkDate = date || new Date();
    
    // Check if building is active
    if (this.props.status !== BuildingStatus.ACTIVE) {
      return false;
    }

    // Check special dates first
    const dateStr = checkDate.toISOString().split('T')[0];
    const specialDate = this.props.specialDates.find(sd => sd.date === dateStr);
    
    if (specialDate) {
      if (specialDate.type === 'CLOSED') {
        return false;
      }
      if (specialDate.type === 'SPECIAL_HOURS' && specialDate.hours) {
        return this.isTimeInRange(checkDate, specialDate.hours.open, specialDate.hours.close);
      }
    }

    // Check regular operating hours
    const dayOfWeek = checkDate.toLocaleLowerCase().slice(0, 3);
    const dayHours = this.props.operatingHours[dayOfWeek];
    
    if (!dayHours || dayHours.closed) {
      return false;
    }

    return this.isTimeInRange(checkDate, dayHours.open, dayHours.close);
  }

  private isTimeInRange(date: Date, openTime: string, closeTime: string): boolean {
    const [openHour, openMinute] = openTime.split(':').map(Number);
    const [closeHour, closeMinute] = closeTime.split(':').map(Number);
    
    const currentMinutes = date.getHours() * 60 + date.getMinutes();
    const openMinutes = openHour * 60 + openMinute;
    const closeMinutes = closeHour * 60 + closeMinute;
    
    return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
  }

  public updateOccupancy(count: number): void {
    if (count < 0) {
      throw new Error('Occupancy cannot be negative');
    }
    if (this.props.maxOccupancy && count > this.props.maxOccupancy) {
      throw new Error('Occupancy cannot exceed maximum capacity');
    }
    
    this.props.currentOccupancy = count;
    this.props.updatedAt = new Date();
  }

  public incrementOccupancy(): void {
    const current = this.props.currentOccupancy || 0;
    this.updateOccupancy(current + 1);
  }

  public decrementOccupancy(): void {
    const current = this.props.currentOccupancy || 0;
    if (current > 0) {
      this.updateOccupancy(current - 1);
    }
  }

  public getOccupancyRate(): number {
    if (!this.props.maxOccupancy || !this.props.currentOccupancy) {
      return 0;
    }
    return (this.props.currentOccupancy / this.props.maxOccupancy) * 100;
  }

  public isAtCapacity(): boolean {
    if (!this.props.maxOccupancy || !this.props.currentOccupancy) {
      return false;
    }
    return this.props.currentOccupancy >= this.props.maxOccupancy;
  }

  public addFacility(facility: string): void {
    if (!this.props.facilities.includes(facility)) {
      this.props.facilities.push(facility);
      this.props.updatedAt = new Date();
    }
  }

  public removeFacility(facility: string): void {
    const index = this.props.facilities.indexOf(facility);
    if (index > -1) {
      this.props.facilities.splice(index, 1);
      this.props.updatedAt = new Date();
    }
  }

  public addFeature(feature: string): void {
    if (!this.props.features.includes(feature)) {
      this.props.features.push(feature);
      this.props.updatedAt = new Date();
    }
  }

  public removeFeature(feature: string): void {
    const index = this.props.features.indexOf(feature);
    if (index > -1) {
      this.props.features.splice(index, 1);
      this.props.updatedAt = new Date();
    }
  }

  public addSpecialDate(specialDate: BuildingProps['specialDates'][0]): void {
    this.props.specialDates.push(specialDate);
    this.props.updatedAt = new Date();
  }

  public removeSpecialDate(date: string): void {
    this.props.specialDates = this.props.specialDates.filter(sd => sd.date !== date);
    this.props.updatedAt = new Date();
  }

  public addEmergencyContact(contact: BuildingProps['emergencyContacts'][0]): void {
    this.props.emergencyContacts.push(contact);
    // Sort by priority
    this.props.emergencyContacts.sort((a, b) => a.priority - b.priority);
    this.props.updatedAt = new Date();
  }

  public removeEmergencyContact(contactName: string): void {
    this.props.emergencyContacts = this.props.emergencyContacts.filter(ec => ec.name !== contactName);
    this.props.updatedAt = new Date();
  }

  public updateAccessControlSystem(system: BuildingProps['accessControlSystem']): void {
    this.props.accessControlSystem = system;
    this.props.updatedAt = new Date();
  }

  public updateSecurityLevel(level: BuildingProps['securityLevel']): void {
    this.props.securityLevel = level;
    this.props.updatedAt = new Date();
  }
}