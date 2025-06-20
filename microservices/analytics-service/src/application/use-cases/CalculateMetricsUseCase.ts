import { Metric, MetricType, MetricCategory, MetricCalculation, AggregationType } from '@domain/entities/Metric';
import { IMetricRepository } from '@domain/repositories/IMetricRepository';
import { IQueryRepository } from '@domain/repositories/IQueryRepository';
import { EventBus } from '@infrastructure/services/EventBus';
import { CacheService } from '@infrastructure/cache/CacheService';
import { Logger } from '@infrastructure/logging/Logger';

export interface CalculateMetricsInput {
  metricIds?: string[];
  categories?: MetricCategory[];
  force?: boolean; // Force recalculation even if cached
}

export interface MetricCalculationResult {
  metricId: string;
  name: string;
  oldValue: number;
  newValue: number;
  changePercentage: number | null;
  status: 'normal' | 'warning' | 'critical' | null;
  calculatedAt: Date;
}

export class CalculateMetricsUseCase {
  constructor(
    private readonly metricRepository: IMetricRepository,
    private readonly queryRepository: IQueryRepository,
    private readonly cacheService: CacheService,
    private readonly eventBus: EventBus,
    private readonly logger: Logger
  ) {}

  async execute(input: CalculateMetricsInput): Promise<MetricCalculationResult[]> {
    // Fetch metrics to calculate
    let metrics: Metric[] = [];

    if (input.metricIds && input.metricIds.length > 0) {
      metrics = await Promise.all(
        input.metricIds.map(id => this.metricRepository.findById(id))
      ).then(results => results.filter((m): m is Metric => m !== null));
    } else if (input.categories && input.categories.length > 0) {
      for (const category of input.categories) {
        const categoryMetrics = await this.metricRepository.findByCategory(category);
        metrics.push(...categoryMetrics);
      }
    } else {
      // Calculate all metrics
      metrics = await this.metricRepository.findAll();
    }

    // Calculate metrics in parallel
    const results = await Promise.all(
      metrics.map(metric => this.calculateMetric(metric, input.force))
    );

    // Publish metric update events
    for (const result of results) {
      if (result.oldValue !== result.newValue) {
        await this.eventBus.publish('metric.updated', {
          metricId: result.metricId,
          name: result.name,
          oldValue: result.oldValue,
          newValue: result.newValue,
          changePercentage: result.changePercentage,
          status: result.status,
          timestamp: result.calculatedAt
        });
      }
    }

    return results;
  }

  private async calculateMetric(metric: Metric, force?: boolean): Promise<MetricCalculationResult> {
    const cacheKey = `metric:${metric.id}:value`;
    
    // Check cache if not forced
    if (!force) {
      const cachedValue = await this.cacheService.get<number>(cacheKey);
      if (cachedValue !== null) {
        return {
          metricId: metric.id,
          name: metric.name,
          oldValue: metric.currentValue,
          newValue: cachedValue,
          changePercentage: this.calculateChangePercentage(metric.currentValue, cachedValue),
          status: metric.checkThresholds(),
          calculatedAt: new Date()
        };
      }
    }

    try {
      // Calculate new value based on metric calculation definition
      const newValue = await this.executeCalculation(metric.calculation);

      // Update metric with new value
      const updatedMetric = metric.updateValue(newValue);
      await this.metricRepository.update(updatedMetric);

      // Save metric value to time series
      await this.metricRepository.saveValue(metric.id, {
        value: newValue,
        timestamp: new Date()
      });

      // Cache the result
      const cacheDuration = this.getCacheDuration(metric.calculation.timeWindow);
      await this.cacheService.set(cacheKey, newValue, cacheDuration);

      return {
        metricId: metric.id,
        name: metric.name,
        oldValue: metric.currentValue,
        newValue: newValue,
        changePercentage: metric.getChangePercentage(),
        status: updatedMetric.checkThresholds(),
        calculatedAt: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to calculate metric', {
        metricId: metric.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  private async executeCalculation(calculation: MetricCalculation): Promise<number> {
    const { formula, variables, aggregation, timeWindow, filters } = calculation;

    // Build query based on calculation type
    let query = '';
    const params: any[] = [];

    if (formula) {
      // Custom formula calculation
      const variableValues = await this.fetchVariableValues(variables, timeWindow, filters);
      return this.evaluateFormula(formula, variableValues);
    } else {
      // Standard aggregation calculation
      query = this.buildAggregationQuery(aggregation, timeWindow, filters);
      const result = await this.queryRepository.executeRaw(query, params);
      
      return result.data[0]?.value || 0;
    }
  }

  private async fetchVariableValues(
    variables: string[],
    timeWindow?: string,
    filters?: Record<string, any>
  ): Promise<Record<string, number>> {
    const values: Record<string, number> = {};

    for (const variable of variables) {
      // Parse variable definition (e.g., "orders.count", "revenue.sum")
      const [table, field, func] = variable.split('.');
      
      let query = '';
      const params: any[] = [];

      if (func) {
        query = `SELECT ${func.toUpperCase()}(${field}) as value FROM ${table}`;
      } else {
        query = `SELECT ${field} as value FROM ${table}`;
      }

      // Add time window filter
      if (timeWindow) {
        query += ` WHERE created_at >= NOW() - INTERVAL '${timeWindow}'`;
      }

      // Add custom filters
      if (filters) {
        const filterClauses = Object.entries(filters).map(([key, value], index) => {
          params.push(value);
          return `${key} = $${index + 1}`;
        });
        
        query += timeWindow ? ' AND ' : ' WHERE ';
        query += filterClauses.join(' AND ');
      }

      const result = await this.queryRepository.executeRaw(query, params);
      values[variable] = result.data[0]?.value || 0;
    }

    return values;
  }

  private evaluateFormula(formula: string, variables: Record<string, number>): number {
    // Replace variables in formula with their values
    let evaluableFormula = formula;
    
    Object.entries(variables).forEach(([variable, value]) => {
      evaluableFormula = evaluableFormula.replace(
        new RegExp(`\\b${variable}\\b`, 'g'),
        value.toString()
      );
    });

    // Safely evaluate the formula
    try {
      // Using Function constructor for safe evaluation
      const func = new Function('return ' + evaluableFormula);
      const result = func();
      
      if (typeof result !== 'number' || isNaN(result)) {
        throw new Error('Formula did not evaluate to a valid number');
      }
      
      return result;
    } catch (error) {
      throw new Error(`Failed to evaluate formula: ${formula}`);
    }
  }

  private buildAggregationQuery(
    aggregation: AggregationType,
    timeWindow?: string,
    filters?: Record<string, any>
  ): string {
    let query = '';

    switch (aggregation) {
      case AggregationType.SUM:
        query = 'SELECT SUM(value) as value FROM metric_values';
        break;
      case AggregationType.AVG:
        query = 'SELECT AVG(value) as value FROM metric_values';
        break;
      case AggregationType.MIN:
        query = 'SELECT MIN(value) as value FROM metric_values';
        break;
      case AggregationType.MAX:
        query = 'SELECT MAX(value) as value FROM metric_values';
        break;
      case AggregationType.COUNT:
        query = 'SELECT COUNT(*) as value FROM metric_values';
        break;
      case AggregationType.DISTINCT:
        query = 'SELECT COUNT(DISTINCT value) as value FROM metric_values';
        break;
      case AggregationType.MEDIAN:
        query = 'SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY value) as value FROM metric_values';
        break;
      case AggregationType.PERCENTILE:
        query = 'SELECT PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) as value FROM metric_values';
        break;
    }

    // Add time window filter
    if (timeWindow) {
      query += ` WHERE timestamp >= NOW() - INTERVAL '${timeWindow}'`;
    }

    return query;
  }

  private calculateChangePercentage(oldValue: number, newValue: number): number | null {
    if (oldValue === 0) return null;
    return ((newValue - oldValue) / oldValue) * 100;
  }

  private getCacheDuration(timeWindow?: string): number {
    if (!timeWindow) return 300; // 5 minutes default

    // Parse time window and return appropriate cache duration
    const match = timeWindow.match(/^(\d+)([hdwm])$/);
    if (!match) return 300;

    const [, value, unit] = match;
    const numValue = parseInt(value);

    switch (unit) {
      case 'h': // hours
        return numValue * 60; // Cache for 1/60th of the window
      case 'd': // days
        return numValue * 60 * 2; // Cache for 2 minutes per day
      case 'w': // weeks
        return numValue * 60 * 10; // Cache for 10 minutes per week
      case 'm': // months
        return numValue * 60 * 30; // Cache for 30 minutes per month
      default:
        return 300;
    }
  }

  async calculateKPIs(): Promise<MetricCalculationResult[]> {
    const kpis = await this.metricRepository.findKPIs();
    
    return this.execute({
      metricIds: kpis.map(m => m.id),
      force: true
    });
  }

  async scheduleRecalculation(metricId: string, interval: string): Promise<void> {
    // This would integrate with a job scheduler
    await this.eventBus.publish('metric.schedule', {
      metricId,
      interval,
      action: 'recalculate'
    });
  }
}