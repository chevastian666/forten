export class PIN {
  private readonly value: string;
  private readonly expiresAt?: Date;

  constructor(value: string, expiresAt?: Date) {
    if (!PIN.isValid(value)) {
      throw new Error('Invalid PIN format');
    }
    this.value = value;
    this.expiresAt = expiresAt;
  }

  static isValid(value: string): boolean {
    // PIN must be 4-8 digits
    return /^\d{4,8}$/.test(value);
  }

  static generate(length: number = 6): PIN {
    if (length < 4 || length > 8) {
      throw new Error('PIN length must be between 4 and 8');
    }
    
    let pin = '';
    for (let i = 0; i < length; i++) {
      pin += Math.floor(Math.random() * 10).toString();
    }
    
    return new PIN(pin);
  }

  static generateTemporary(length: number = 6, validityHours: number = 24): PIN {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + validityHours);
    
    const pin = PIN.generate(length);
    return new PIN(pin.value, expiresAt);
  }

  getValue(): string {
    return this.value;
  }

  getMaskedValue(): string {
    return this.value.replace(/\d/g, '*');
  }

  getExpiresAt(): Date | undefined {
    return this.expiresAt;
  }

  isExpired(): boolean {
    if (!this.expiresAt) {
      return false;
    }
    return new Date() > this.expiresAt;
  }

  equals(other: PIN): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.getMaskedValue();
  }
}