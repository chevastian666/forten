export type AccessType = 'visitor' | 'temporary' | 'service' | 'emergency';

export interface IAccess {
  id: string;
  buildingId: string;
  pin: string;
  name: string;
  phone?: string;
  type: AccessType;
  validFrom: Date;
  validUntil: Date;
  maxUses: number;
  currentUses: number;
  isActive: boolean;
  createdBy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Access implements IAccess {
  constructor(
    public id: string,
    public buildingId: string,
    public pin: string,
    public name: string,
    public type: AccessType,
    public validFrom: Date,
    public validUntil: Date,
    public maxUses: number = 1,
    public currentUses: number = 0,
    public isActive: boolean = true,
    public phone?: string,
    public createdBy?: string,
    public notes?: string,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}

  isValid(): boolean {
    const now = new Date();
    return (
      this.isActive &&
      now >= this.validFrom &&
      now <= this.validUntil &&
      this.currentUses < this.maxUses
    );
  }

  canUse(): boolean {
    return this.isValid() && this.hasRemainingUses();
  }

  hasRemainingUses(): boolean {
    return this.currentUses < this.maxUses;
  }

  use(): boolean {
    if (this.canUse()) {
      this.currentUses++;
      this.updatedAt = new Date();
      return true;
    }
    return false;
  }

  getRemainingUses(): number {
    return Math.max(0, this.maxUses - this.currentUses);
  }

  deactivate(): void {
    this.isActive = false;
    this.updatedAt = new Date();
  }
}