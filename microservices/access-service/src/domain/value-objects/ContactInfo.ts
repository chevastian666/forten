export class ContactInfo {
  constructor(
    public readonly name: string,
    public readonly phone: string,
    public readonly email?: string,
    public readonly relationship?: string
  ) {
    if (!this.isValidPhone(phone)) {
      throw new Error('Invalid phone number');
    }
    if (email && !this.isValidEmail(email)) {
      throw new Error('Invalid email address');
    }
  }

  private isValidPhone(phone: string): boolean {
    // Basic phone validation - can be enhanced based on requirements
    return /^[\d\s\-\+\(\)]+$/.test(phone) && phone.length >= 10;
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  toString(): string {
    return `${this.name} (${this.phone})`;
  }

  toJSON(): Record<string, any> {
    return {
      name: this.name,
      phone: this.phone,
      email: this.email,
      relationship: this.relationship
    };
  }
}