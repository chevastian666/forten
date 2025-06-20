import { Metric, MetricType, MetricCategory, MetricValue } from '../entities/Metric';

export interface MetricFilters {
  category?: MetricCategory;
  type?: MetricType;
  isKpi?: boolean;
  tags?: string[];
  name?: string;
}

export interface MetricTimeSeriesQuery {
  metricId: string;
  startDate: Date;
  endDate: Date;
  interval?: string; // e.g., '1h', '1d'
  dimensions?: Record<string, string>;
}

export interface IMetricRepository {
  findById(id: string): Promise<Metric | null>;
  findAll(filters?: MetricFilters, limit?: number, offset?: number): Promise<Metric[]>;
  findKPIs(): Promise<Metric[]>;
  findByCategory(category: MetricCategory): Promise<Metric[]>;
  findByTags(tags: string[]): Promise<Metric[]>;
  save(metric: Metric): Promise<Metric>;
  update(metric: Metric): Promise<Metric>;
  delete(id: string): Promise<boolean>;
  
  // Metric value operations
  saveValue(metricId: string, value: MetricValue): Promise<void>;
  saveValues(metricId: string, values: MetricValue[]): Promise<void>;
  getLatestValue(metricId: string): Promise<MetricValue | null>;
  getTimeSeries(query: MetricTimeSeriesQuery): Promise<MetricValue[]>;
  aggregateValues(
    metricId: string,
    startDate: Date,
    endDate: Date,
    aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count'
  ): Promise<number>;
  
  // Bulk operations
  findMetricsToUpdate(): Promise<Metric[]>;
  updateMultiple(metrics: Metric[]): Promise<Metric[]>;
}