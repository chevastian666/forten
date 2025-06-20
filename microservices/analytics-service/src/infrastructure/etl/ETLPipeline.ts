import { Queue, Worker, Job } from 'bullmq';
import { Logger } from '@infrastructure/logging/Logger';
import { IDatasetRepository } from '@domain/repositories/IDatasetRepository';
import { Dataset, DatasetStatus } from '@domain/entities/Dataset';
import { EventBus } from '@infrastructure/services/EventBus';
import Redis from 'ioredis';

export interface ETLJob {
  type: 'extract' | 'transform' | 'load' | 'full';
  datasetId: string;
  config: {
    source?: {
      type: string;
      connectionString?: string;
      query?: string;
      filePath?: string;
      apiEndpoint?: string;
    };
    transformations?: Array<{
      type: string;
      config: any;
    }>;
    destination?: {
      type: string;
      table?: string;
      format?: string;
    };
    options?: {
      batchSize?: number;
      parallel?: boolean;
      retryOnError?: boolean;
      errorThreshold?: number;
    };
  };
}

export interface ETLResult {
  jobId: string;
  status: 'success' | 'failed' | 'partial';
  processedRecords: number;
  failedRecords: number;
  duration: number;
  errors?: string[];
}

export class ETLPipeline {
  private extractQueue: Queue;
  private transformQueue: Queue;
  private loadQueue: Queue;
  private workers: Worker[] = [];

  constructor(
    private readonly datasetRepository: IDatasetRepository,
    private readonly eventBus: EventBus,
    private readonly logger: Logger,
    private readonly redis: Redis
  ) {
    // Initialize queues
    this.extractQueue = new Queue('etl-extract', {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    });

    this.transformQueue = new Queue('etl-transform', {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    });

    this.loadQueue = new Queue('etl-load', {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    });

    this.setupWorkers();
  }

  async runETL(job: ETLJob): Promise<ETLResult> {
    const startTime = Date.now();
    const jobId = `etl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Update dataset status
      const dataset = await this.datasetRepository.findById(job.datasetId);
      if (!dataset) {
        throw new Error(`Dataset ${job.datasetId} not found`);
      }

      await this.datasetRepository.update(
        dataset.updateStatus(DatasetStatus.PROCESSING)
      );

      let result: ETLResult;

      switch (job.type) {
        case 'extract':
          result = await this.runExtract(jobId, job);
          break;
        case 'transform':
          result = await this.runTransform(jobId, job);
          break;
        case 'load':
          result = await this.runLoad(jobId, job);
          break;
        case 'full':
          result = await this.runFullPipeline(jobId, job);
          break;
        default:
          throw new Error(`Unknown ETL job type: ${job.type}`);
      }

      // Update dataset status based on result
      const finalStatus = result.status === 'success' ? 
        DatasetStatus.ACTIVE : 
        DatasetStatus.ERROR;

      await this.datasetRepository.update(
        dataset.updateStatus(finalStatus)
      );

      // Publish completion event
      await this.eventBus.publish('etl.completed', {
        jobId,
        datasetId: job.datasetId,
        result
      });

      return result;
    } catch (error) {
      this.logger.error('ETL job failed', {
        jobId,
        job,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        jobId,
        status: 'failed',
        processedRecords: 0,
        failedRecords: 0,
        duration: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  private async runExtract(jobId: string, job: ETLJob): Promise<ETLResult> {
    const extractJob = await this.extractQueue.add('extract', {
      jobId,
      ...job
    });

    const result = await extractJob.waitUntilFinished(this.extractQueue.events);
    return result as ETLResult;
  }

  private async runTransform(jobId: string, job: ETLJob): Promise<ETLResult> {
    const transformJob = await this.transformQueue.add('transform', {
      jobId,
      ...job
    });

    const result = await transformJob.waitUntilFinished(this.transformQueue.events);
    return result as ETLResult;
  }

  private async runLoad(jobId: string, job: ETLJob): Promise<ETLResult> {
    const loadJob = await this.loadQueue.add('load', {
      jobId,
      ...job
    });

    const result = await loadJob.waitUntilFinished(this.loadQueue.events);
    return result as ETLResult;
  }

  private async runFullPipeline(jobId: string, job: ETLJob): Promise<ETLResult> {
    const startTime = Date.now();
    let processedRecords = 0;
    let failedRecords = 0;
    const errors: string[] = [];

    try {
      // Extract
      const extractResult = await this.runExtract(jobId, {
        ...job,
        type: 'extract'
      });

      if (extractResult.status === 'failed') {
        return extractResult;
      }

      processedRecords += extractResult.processedRecords;
      failedRecords += extractResult.failedRecords;
      if (extractResult.errors) errors.push(...extractResult.errors);

      // Transform
      const transformResult = await this.runTransform(jobId, {
        ...job,
        type: 'transform'
      });

      if (transformResult.status === 'failed') {
        return {
          ...transformResult,
          processedRecords,
          failedRecords: failedRecords + transformResult.failedRecords
        };
      }

      processedRecords = transformResult.processedRecords;
      failedRecords += transformResult.failedRecords;
      if (transformResult.errors) errors.push(...transformResult.errors);

      // Load
      const loadResult = await this.runLoad(jobId, {
        ...job,
        type: 'load'
      });

      return {
        jobId,
        status: loadResult.status,
        processedRecords: loadResult.processedRecords,
        failedRecords: failedRecords + loadResult.failedRecords,
        duration: Date.now() - startTime,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      return {
        jobId,
        status: 'failed',
        processedRecords,
        failedRecords,
        duration: Date.now() - startTime,
        errors: [...errors, error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  private setupWorkers(): void {
    // Extract Worker
    const extractWorker = new Worker(
      'etl-extract',
      async (job: Job) => {
        return this.processExtractJob(job);
      },
      {
        connection: this.redis,
        concurrency: 5
      }
    );

    // Transform Worker
    const transformWorker = new Worker(
      'etl-transform',
      async (job: Job) => {
        return this.processTransformJob(job);
      },
      {
        connection: this.redis,
        concurrency: 10
      }
    );

    // Load Worker
    const loadWorker = new Worker(
      'etl-load',
      async (job: Job) => {
        return this.processLoadJob(job);
      },
      {
        connection: this.redis,
        concurrency: 5
      }
    );

    this.workers = [extractWorker, transformWorker, loadWorker];

    // Setup error handlers
    this.workers.forEach(worker => {
      worker.on('failed', (job, err) => {
        this.logger.error(`Worker failed: ${worker.name}`, {
          jobId: job?.id,
          error: err.message
        });
      });
    });
  }

  private async processExtractJob(job: Job): Promise<ETLResult> {
    const { jobId, datasetId, config } = job.data;
    const startTime = Date.now();
    let processedRecords = 0;
    const errors: string[] = [];

    try {
      const { source, options } = config;
      const batchSize = options?.batchSize || 1000;

      let data: any[] = [];

      switch (source.type) {
        case 'database':
          data = await this.extractFromDatabase(source);
          break;
        case 'file':
          data = await this.extractFromFile(source);
          break;
        case 'api':
          data = await this.extractFromAPI(source);
          break;
        default:
          throw new Error(`Unsupported source type: ${source.type}`);
      }

      // Store extracted data in temporary storage
      const tempKey = `etl:${jobId}:extracted`;
      await this.storeTempData(tempKey, data);

      processedRecords = data.length;

      return {
        jobId,
        status: 'success',
        processedRecords,
        failedRecords: 0,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        jobId,
        status: 'failed',
        processedRecords,
        failedRecords: 0,
        duration: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  private async processTransformJob(job: Job): Promise<ETLResult> {
    const { jobId, datasetId, config } = job.data;
    const startTime = Date.now();
    let processedRecords = 0;
    let failedRecords = 0;
    const errors: string[] = [];

    try {
      // Retrieve extracted data
      const tempKey = `etl:${jobId}:extracted`;
      let data = await this.getTempData(tempKey);

      if (!data || data.length === 0) {
        throw new Error('No data found for transformation');
      }

      // Apply transformations
      for (const transformation of config.transformations || []) {
        try {
          data = await this.applyTransformation(data, transformation);
        } catch (error) {
          errors.push(`Transformation ${transformation.type} failed: ${error}`);
          if (config.options?.errorThreshold && 
              errors.length >= config.options.errorThreshold) {
            throw new Error('Error threshold exceeded');
          }
        }
      }

      // Store transformed data
      const transformedKey = `etl:${jobId}:transformed`;
      await this.storeTempData(transformedKey, data);

      processedRecords = data.length;

      return {
        jobId,
        status: errors.length > 0 ? 'partial' : 'success',
        processedRecords,
        failedRecords,
        duration: Date.now() - startTime,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      return {
        jobId,
        status: 'failed',
        processedRecords,
        failedRecords,
        duration: Date.now() - startTime,
        errors: [...errors, error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  private async processLoadJob(job: Job): Promise<ETLResult> {
    const { jobId, datasetId, config } = job.data;
    const startTime = Date.now();
    let processedRecords = 0;
    let failedRecords = 0;

    try {
      // Retrieve transformed data
      const transformedKey = `etl:${jobId}:transformed`;
      const data = await this.getTempData(transformedKey);

      if (!data || data.length === 0) {
        throw new Error('No data found for loading');
      }

      // Load data to destination
      const { destination, options } = config;
      const batchSize = options?.batchSize || 1000;

      // Process in batches
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        
        try {
          await this.loadBatch(datasetId, batch, destination);
          processedRecords += batch.length;
        } catch (error) {
          failedRecords += batch.length;
          if (!options?.retryOnError) {
            throw error;
          }
        }
      }

      // Clean up temporary data
      await this.cleanupTempData(jobId);

      return {
        jobId,
        status: failedRecords > 0 ? 'partial' : 'success',
        processedRecords,
        failedRecords,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        jobId,
        status: 'failed',
        processedRecords,
        failedRecords,
        duration: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  private async extractFromDatabase(source: any): Promise<any[]> {
    // Implementation would connect to database and execute query
    // This is a placeholder
    return [];
  }

  private async extractFromFile(source: any): Promise<any[]> {
    // Implementation would read and parse file
    // This is a placeholder
    return [];
  }

  private async extractFromAPI(source: any): Promise<any[]> {
    // Implementation would fetch data from API
    // This is a placeholder
    return [];
  }

  private async applyTransformation(data: any[], transformation: any): Promise<any[]> {
    const { type, config } = transformation;

    switch (type) {
      case 'filter':
        return this.applyFilter(data, config);
      case 'map':
        return this.applyMap(data, config);
      case 'aggregate':
        return this.applyAggregate(data, config);
      case 'join':
        return this.applyJoin(data, config);
      case 'pivot':
        return this.applyPivot(data, config);
      default:
        throw new Error(`Unsupported transformation type: ${type}`);
    }
  }

  private applyFilter(data: any[], config: any): any[] {
    const { field, operator, value } = config;
    
    return data.filter(record => {
      const fieldValue = record[field];
      
      switch (operator) {
        case 'eq': return fieldValue === value;
        case 'ne': return fieldValue !== value;
        case 'gt': return fieldValue > value;
        case 'gte': return fieldValue >= value;
        case 'lt': return fieldValue < value;
        case 'lte': return fieldValue <= value;
        case 'in': return value.includes(fieldValue);
        case 'nin': return !value.includes(fieldValue);
        case 'contains': return String(fieldValue).includes(value);
        case 'regex': return new RegExp(value).test(String(fieldValue));
        default: return true;
      }
    });
  }

  private applyMap(data: any[], config: any): any[] {
    const { mappings } = config;
    
    return data.map(record => {
      const mappedRecord: any = {};
      
      for (const [targetField, sourceConfig] of Object.entries(mappings)) {
        if (typeof sourceConfig === 'string') {
          // Simple field mapping
          mappedRecord[targetField] = record[sourceConfig];
        } else if (typeof sourceConfig === 'object') {
          // Complex mapping with transformation
          const { field, transform } = sourceConfig as any;
          let value = record[field];
          
          if (transform) {
            value = this.applyFieldTransform(value, transform);
          }
          
          mappedRecord[targetField] = value;
        }
      }
      
      return mappedRecord;
    });
  }

  private applyFieldTransform(value: any, transform: string): any {
    switch (transform) {
      case 'uppercase': return String(value).toUpperCase();
      case 'lowercase': return String(value).toLowerCase();
      case 'trim': return String(value).trim();
      case 'number': return Number(value);
      case 'boolean': return Boolean(value);
      case 'date': return new Date(value);
      default: return value;
    }
  }

  private applyAggregate(data: any[], config: any): any[] {
    // Simplified aggregation implementation
    const { groupBy, aggregations } = config;
    const groups = new Map<string, any[]>();

    // Group data
    data.forEach(record => {
      const key = groupBy.map((field: string) => record[field]).join('|');
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(record);
    });

    // Apply aggregations
    const result: any[] = [];
    groups.forEach((groupData, key) => {
      const keyValues = key.split('|');
      const aggregatedRecord: any = {};

      // Add group by fields
      groupBy.forEach((field: string, index: number) => {
        aggregatedRecord[field] = keyValues[index];
      });

      // Apply aggregation functions
      aggregations.forEach((agg: any) => {
        const { field, function: func, alias } = agg;
        const values = groupData.map(r => r[field]).filter(v => v !== null && v !== undefined);
        
        switch (func) {
          case 'sum':
            aggregatedRecord[alias || `${func}_${field}`] = values.reduce((a, b) => a + b, 0);
            break;
          case 'avg':
            aggregatedRecord[alias || `${func}_${field}`] = values.reduce((a, b) => a + b, 0) / values.length;
            break;
          case 'min':
            aggregatedRecord[alias || `${func}_${field}`] = Math.min(...values);
            break;
          case 'max':
            aggregatedRecord[alias || `${func}_${field}`] = Math.max(...values);
            break;
          case 'count':
            aggregatedRecord[alias || `${func}_${field}`] = values.length;
            break;
        }
      });

      result.push(aggregatedRecord);
    });

    return result;
  }

  private applyJoin(data: any[], config: any): any[] {
    // Simplified join implementation
    // In production, this would handle different join types
    return data;
  }

  private applyPivot(data: any[], config: any): any[] {
    // Simplified pivot implementation
    return data;
  }

  private async loadBatch(datasetId: string, batch: any[], destination: any): Promise<void> {
    await this.datasetRepository.insertData(datasetId, batch);
  }

  private async storeTempData(key: string, data: any[]): Promise<void> {
    // Store data in chunks to avoid memory issues
    const chunkSize = 1000;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      await this.redis.rpush(key, ...chunk.map(item => JSON.stringify(item)));
    }
    await this.redis.expire(key, 3600); // 1 hour TTL
  }

  private async getTempData(key: string): Promise<any[]> {
    const data = await this.redis.lrange(key, 0, -1);
    return data.map(item => JSON.parse(item));
  }

  private async cleanupTempData(jobId: string): Promise<void> {
    const keys = [
      `etl:${jobId}:extracted`,
      `etl:${jobId}:transformed`
    ];
    await this.redis.del(...keys);
  }

  async scheduleETL(schedule: string, job: ETLJob): Promise<void> {
    // This would integrate with a job scheduler
    await this.eventBus.publish('etl.schedule', {
      schedule,
      job
    });
  }

  async getJobStatus(jobId: string): Promise<any> {
    // Get job status from queues
    const extractJob = await this.extractQueue.getJob(jobId);
    const transformJob = await this.transformQueue.getJob(jobId);
    const loadJob = await this.loadQueue.getJob(jobId);

    return {
      extract: extractJob ? await extractJob.getState() : null,
      transform: transformJob ? await transformJob.getState() : null,
      load: loadJob ? await loadJob.getState() : null
    };
  }

  async stop(): Promise<void> {
    await Promise.all(this.workers.map(worker => worker.close()));
  }
}