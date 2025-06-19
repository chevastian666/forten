export type BuildingStatus = 'prospect' | 'quoting' | 'contract' | 'active' | 'inactive';

export interface IBuilding {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  status: BuildingStatus;
  contractDate?: Date;
  installationDate?: Date;
  totalUnits: number;
  totalCameras: number;
  qboxSerial?: string;
  hikCentralId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Building implements IBuilding {
  constructor(
    public id: string,
    public name: string,
    public address: string,
    public city: string,
    public country: string = 'Uruguay',
    public status: BuildingStatus = 'prospect',
    public totalUnits: number = 0,
    public totalCameras: number = 0,
    public postalCode?: string,
    public phone?: string,
    public email?: string,
    public contractDate?: Date,
    public installationDate?: Date,
    public qboxSerial?: string,
    public hikCentralId?: string,
    public notes?: string,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}

  isActive(): boolean {
    return this.status === 'active';
  }

  canBeMonitored(): boolean {
    return this.isActive() && this.hikCentralId !== undefined;
  }

  getFullAddress(): string {
    const parts = [this.address, this.city];
    if (this.postalCode) parts.push(this.postalCode);
    parts.push(this.country);
    return parts.join(', ');
  }
}