export class TimeZone {
  private static readonly VALID_TIMEZONES = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Phoenix',
    'America/Anchorage',
    'Pacific/Honolulu',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Singapore',
    'Australia/Sydney',
    'Australia/Melbourne'
  ];

  constructor(private readonly value: string) {
    if (!TimeZone.isValid(value)) {
      throw new Error(`Invalid timezone: ${value}`);
    }
  }

  static isValid(value: string): boolean {
    return TimeZone.VALID_TIMEZONES.includes(value);
  }

  getValue(): string {
    return this.value;
  }

  getOffset(): number {
    // This is a simplified offset calculation
    // In production, use a proper timezone library
    const offsets: Record<string, number> = {
      'UTC': 0,
      'America/New_York': -5,
      'America/Chicago': -6,
      'America/Denver': -7,
      'America/Los_Angeles': -8,
      'America/Phoenix': -7,
      'America/Anchorage': -9,
      'Pacific/Honolulu': -10,
      'Europe/London': 0,
      'Europe/Paris': 1,
      'Europe/Berlin': 1,
      'Asia/Tokyo': 9,
      'Asia/Shanghai': 8,
      'Asia/Singapore': 8,
      'Australia/Sydney': 11,
      'Australia/Melbourne': 11
    };
    
    return offsets[this.value] || 0;
  }

  toString(): string {
    return this.value;
  }

  equals(other: TimeZone): boolean {
    return this.value === other.value;
  }
}