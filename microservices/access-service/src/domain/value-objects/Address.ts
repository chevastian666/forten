export class Address {
  constructor(
    public readonly street: string,
    public readonly city: string,
    public readonly state: string,
    public readonly country: string,
    public readonly postalCode: string,
    public readonly suite?: string
  ) {
    if (!street || !city || !state || !country || !postalCode) {
      throw new Error('All address fields except suite are required');
    }
  }

  toString(): string {
    const parts = [this.street];
    if (this.suite) {
      parts.push(this.suite);
    }
    parts.push(`${this.city}, ${this.state} ${this.postalCode}`);
    parts.push(this.country);
    
    return parts.join(', ');
  }

  toJSON(): Record<string, any> {
    return {
      street: this.street,
      suite: this.suite,
      city: this.city,
      state: this.state,
      country: this.country,
      postalCode: this.postalCode
    };
  }

  equals(other: Address): boolean {
    return (
      this.street === other.street &&
      this.city === other.city &&
      this.state === other.state &&
      this.country === other.country &&
      this.postalCode === other.postalCode &&
      this.suite === other.suite
    );
  }
}