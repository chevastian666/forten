import { Dataset, DatasetStatus } from '@domain/entities/Dataset';
import { IDatasetRepository } from '@domain/repositories/IDatasetRepository';
import { IQueryRepository } from '@domain/repositories/IQueryRepository';
import { ETLPipeline } from '@infrastructure/etl/ETLPipeline';
import { CacheService } from '@infrastructure/cache/CacheService';
import { EventBus } from '@infrastructure/services/EventBus';
import { Logger } from '@infrastructure/logging/Logger';

export interface DataAggregationInput {
  sourceDatasets: string[];
  targetDatasetId?: string;
  aggregations: {
    field: string;
    function: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'distinct';
    alias: string;
  }[];
  groupBy?: string[];
  filters?: Record<string, any>;
  timeRange?: {
    start: Date;
    end: Date;
    field: string;
  };
  joinConditions?: {
    leftDataset: string;
    rightDataset: string;
    leftField: string;
    rightField: string;
    type: 'inner' | 'left' | 'right' | 'full';
  }[];
}

export interface DataAggregationOutput {
  datasetId: string;
  rowCount: number;
  processingTime: number;
  status: 'completed' | 'failed';
  error?: string;
}

export class DataAggregationUseCase {
  constructor(
    private readonly datasetRepository: IDatasetRepository,
    private readonly queryRepository: IQueryRepository,
    private readonly etlPipeline: ETLPipeline,
    private readonly cacheService: CacheService,
    private readonly eventBus: EventBus,
    private readonly logger: Logger
  ) {}

  async execute(input: DataAggregationInput): Promise<DataAggregationOutput> {
    const startTime = Date.now();

    try {
      // Validate source datasets exist
      const sourceDatasets = await this.validateSourceDatasets(input.sourceDatasets);

      // Build aggregation query
      const query = this.buildAggregationQuery(input, sourceDatasets);

      // Execute aggregation
      const result = await this.queryRepository.executeRaw(query.sql, query.params);

      // Create or update target dataset
      let targetDataset: Dataset;
      if (input.targetDatasetId) {
        targetDataset = await this.updateExistingDataset(
          input.targetDatasetId,
          result.data,
          result.schema
        );
      } else {
        targetDataset = await this.createNewDataset(
          input,
          result.data,
          result.schema
        );
      }

      // Store aggregated data
      await this.datasetRepository.insertData(targetDataset.id, result.data);

      // Update dataset metadata
      await this.datasetRepository.update(
        targetDataset.updateMetadata({
          rowCount: result.data.length,
          lastModified: new Date()
        })
      );

      // Clear related caches
      await this.invalidateRelatedCaches(input.sourceDatasets);

      // Publish event
      await this.eventBus.publish('data.aggregated', {
        sourceDatasets: input.sourceDatasets,
        targetDataset: targetDataset.id,
        rowCount: result.data.length,
        processingTime: Date.now() - startTime
      });

      return {
        datasetId: targetDataset.id,
        rowCount: result.data.length,
        processingTime: Date.now() - startTime,
        status: 'completed'
      };
    } catch (error) {
      this.logger.error('Data aggregation failed', {
        input,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        datasetId: input.targetDatasetId || '',
        rowCount: 0,
        processingTime: Date.now() - startTime,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async validateSourceDatasets(datasetIds: string[]): Promise<Dataset[]> {
    const datasets = await Promise.all(
      datasetIds.map(id => this.datasetRepository.findById(id))
    );

    const missingDatasets = datasetIds.filter((id, index) => !datasets[index]);
    if (missingDatasets.length > 0) {
      throw new Error(`Datasets not found: ${missingDatasets.join(', ')}`);
    }

    return datasets.filter((d): d is Dataset => d !== null);
  }

  private buildAggregationQuery(
    input: DataAggregationInput,
    sourceDatasets: Dataset[]
  ): { sql: string; params: any[] } {
    let sql = 'WITH ';
    const params: any[] = [];
    let paramIndex = 1;

    // Build CTEs for each source dataset
    const ctes = sourceDatasets.map((dataset, index) => {
      const alias = `ds${index}`;
      let cteQuery = `SELECT * FROM "${dataset.id}"`;

      // Apply time range filter if specified
      if (input.timeRange && dataset.schema.some(f => f.name === input.timeRange.field)) {
        cteQuery += ` WHERE ${input.timeRange.field} BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
        params.push(input.timeRange.start, input.timeRange.end);
        paramIndex += 2;
      }

      return `${alias} AS (${cteQuery})`;
    });

    sql += ctes.join(', ') + ' ';

    // Build main query with joins
    sql += 'SELECT ';

    // Add group by fields
    if (input.groupBy && input.groupBy.length > 0) {
      sql += input.groupBy.join(', ') + ', ';
    }

    // Add aggregations
    sql += input.aggregations
      .map(agg => `${agg.function.toUpperCase()}(${agg.field}) AS ${agg.alias}`)
      .join(', ');

    // Add FROM clause with joins
    sql += ' FROM ds0';

    if (input.joinConditions) {
      input.joinConditions.forEach((join, index) => {
        const leftIndex = sourceDatasets.findIndex(d => d.id === join.leftDataset);
        const rightIndex = sourceDatasets.findIndex(d => d.id === join.rightDataset);

        sql += ` ${join.type.toUpperCase()} JOIN ds${rightIndex} ON ds${leftIndex}.${join.leftField} = ds${rightIndex}.${join.rightField}`;
      });
    }

    // Add WHERE clause for filters
    if (input.filters && Object.keys(input.filters).length > 0) {
      const filterClauses = Object.entries(input.filters).map(([field, value]) => {
        params.push(value);
        return `${field} = $${paramIndex++}`;
      });

      sql += ' WHERE ' + filterClauses.join(' AND ');
    }

    // Add GROUP BY clause
    if (input.groupBy && input.groupBy.length > 0) {
      sql += ' GROUP BY ' + input.groupBy.join(', ');
    }

    return { sql, params };
  }

  private async createNewDataset(
    input: DataAggregationInput,
    data: any[],
    schema: any[]
  ): Promise<Dataset> {
    const dataset = Dataset.create(
      `Aggregated_${Date.now()}`,
      `Aggregation of datasets: ${input.sourceDatasets.join(', ')}`,
      {
        type: 'QUERY',
        query: JSON.stringify(input)
      },
      'system',
      this.inferSchema(schema)
    );

    return this.datasetRepository.save(dataset);
  }

  private async updateExistingDataset(
    datasetId: string,
    data: any[],
    schema: any[]
  ): Promise<Dataset> {
    const dataset = await this.datasetRepository.findById(datasetId);
    if (!dataset) {
      throw new Error(`Target dataset not found: ${datasetId}`);
    }

    // Clear existing data
    await this.datasetRepository.deleteData(datasetId, {});

    // Update schema if changed
    const newSchema = this.inferSchema(schema);
    if (JSON.stringify(dataset.schema) !== JSON.stringify(newSchema)) {
      return this.datasetRepository.update(dataset.updateSchema(newSchema));
    }

    return dataset;
  }

  private inferSchema(rawSchema: any[]): any[] {
    return rawSchema.map(field => ({
      name: field.field,
      type: this.inferDataType(field.type),
      nullable: field.nullable || false
    }));
  }

  private inferDataType(pgType: string): string {
    const typeMap: Record<string, string> = {
      'integer': 'INTEGER',
      'bigint': 'INTEGER',
      'numeric': 'DECIMAL',
      'real': 'DECIMAL',
      'double precision': 'DECIMAL',
      'text': 'STRING',
      'varchar': 'STRING',
      'char': 'STRING',
      'boolean': 'BOOLEAN',
      'date': 'DATE',
      'timestamp': 'DATETIME',
      'timestamptz': 'DATETIME',
      'json': 'JSON',
      'jsonb': 'JSON'
    };

    return typeMap[pgType.toLowerCase()] || 'STRING';
  }

  private async invalidateRelatedCaches(datasetIds: string[]): Promise<void> {
    const cacheKeys = datasetIds.map(id => `dataset:${id}:*`);
    await Promise.all(cacheKeys.map(pattern => this.cacheService.deletePattern(pattern)));
  }

  async aggregateRealTimeData(streamConfig: {
    topic: string;
    window: string;
    aggregations: any[];
    outputDatasetId: string;
  }): Promise<void> {
    // This would integrate with a stream processing system
    await this.eventBus.publish('stream.aggregate', streamConfig);
  }

  async scheduledAggregation(schedule: string, config: DataAggregationInput): Promise<void> {
    // This would integrate with a job scheduler
    await this.eventBus.publish('aggregation.schedule', {
      schedule,
      config,
      action: 'create'
    });
  }
}