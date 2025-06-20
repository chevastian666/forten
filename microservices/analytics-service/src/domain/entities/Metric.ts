export enum MetricType {
  COUNTER = 'COUNTER',
  GAUGE = 'GAUGE',
  HISTOGRAM = 'HISTOGRAM',
  SUMMARY = 'SUMMARY',
  PERCENTAGE = 'PERCENTAGE',
  CURRENCY = 'CURRENCY',
  DURATION = 'DURATION'
}

export enum MetricCategory {
  SALES = 'SALES',
  INVENTORY = 'INVENTORY',
  FINANCE = 'FINANCE',
  CUSTOMER = 'CUSTOMER',
  OPERATIONS = 'OPERATIONS',
  PERFORMANCE = 'PERFORMANCE',
  CUSTOM = 'CUSTOM'
}

export enum AggregationType {
  SUM = 'SUM',
  AVG = 'AVG',
  MIN = 'MIN',
  MAX = 'MAX',
  COUNT = 'COUNT',
  DISTINCT = 'DISTINCT',
  MEDIAN = 'MEDIAN',
  PERCENTILE = 'PERCENTILE'
}

export interface MetricValue {
  value: number;
  timestamp: Date;
  dimensions?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface MetricThreshold {
  warning?: number;
  critical?: number;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'ne';
}

export interface MetricCalculation {
  formula: string;
  variables: string[];
  aggregation: AggregationType;
  timeWindow?: string; // e.g., '1h', '1d', '1w'
  filters?: Record<string, any>;
}

export class Metric {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly type: MetricType,
    public readonly category: MetricCategory,
    public readonly unit: string,
    public readonly calculation: MetricCalculation,
    public readonly currentValue: number,
    public readonly previousValue?: number,
    public readonly thresholds?: MetricThreshold,
    public readonly tags?: string[],
    public readonly isKpi: boolean = false,
    public readonly lastUpdated: Date = new Date(),
    public readonly createdAt: Date = new Date()
  ) {}

  static create(
    name: string,
    description: string,
    type: MetricType,
    category: MetricCategory,
    unit: string,
    calculation: MetricCalculation,
    isKpi: boolean = false,
    thresholds?: MetricThreshold,
    tags?: string[]
  ): Metric {
    const id = `metric-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return new Metric(
      id,
      name,
      description,
      type,
      category,
      unit,
      calculation,
      0,
      undefined,
      thresholds,
      tags,
      isKpi
    );
  }

  updateValue(newValue: number): Metric {
    return new Metric(
      this.id,
      this.name,
      this.description,
      this.type,
      this.category,
      this.unit,
      this.calculation,
      newValue,
      this.currentValue,
      this.thresholds,
      this.tags,
      this.isKpi,
      new Date(),
      this.createdAt
    );
  }

  getChangePercentage(): number | null {
    if (!this.previousValue || this.previousValue === 0) {
      return null;
    }
    return ((this.currentValue - this.previousValue) / this.previousValue) * 100;
  }

  getTrend(): 'up' | 'down' | 'stable' {
    if (!this.previousValue) return 'stable';
    if (this.currentValue > this.previousValue) return 'up';
    if (this.currentValue < this.previousValue) return 'down';
    return 'stable';
  }

  checkThresholds(): 'normal' | 'warning' | 'critical' | null {
    if (!this.thresholds) return null;

    const { warning, critical, operator } = this.thresholds;

    const checkCondition = (threshold: number): boolean => {
      switch (operator) {
        case 'gt':
          return this.currentValue > threshold;
        case 'lt':
          return this.currentValue < threshold;
        case 'gte':
          return this.currentValue >= threshold;
        case 'lte':
          return this.currentValue <= threshold;
        case 'eq':
          return this.currentValue === threshold;
        case 'ne':
          return this.currentValue !== threshold;
        default:
          return false;
      }
    };

    if (critical !== undefined && checkCondition(critical)) {
      return 'critical';
    }

    if (warning !== undefined && checkCondition(warning)) {
      return 'warning';
    }

    return 'normal';
  }

  formatValue(): string {
    switch (this.type) {
      case MetricType.PERCENTAGE:
        return `${this.currentValue.toFixed(2)}%`;
      case MetricType.CURRENCY:
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: this.unit
        }).format(this.currentValue);
      case MetricType.DURATION:
        return this.formatDuration(this.currentValue);
      default:
        return `${this.currentValue.toLocaleString()} ${this.unit}`;
    }
  }

  private formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
}