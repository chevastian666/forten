export enum DatasetStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PROCESSING = 'PROCESSING',
  ARCHIVED = 'ARCHIVED',
  ERROR = 'ERROR'
}

export enum DatasetSourceType {
  TABLE = 'TABLE',
  QUERY = 'QUERY',
  API = 'API',
  FILE = 'FILE',
  STREAM = 'STREAM',
  JOINED = 'JOINED'
}

export enum DataType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  INTEGER = 'INTEGER',
  DECIMAL = 'DECIMAL',
  DATE = 'DATE',
  DATETIME = 'DATETIME',
  BOOLEAN = 'BOOLEAN',
  JSON = 'JSON',
  ARRAY = 'ARRAY'
}

export interface DatasetSchema {
  name: string;
  type: DataType;
  nullable: boolean;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  reference?: {
    dataset: string;
    field: string;
  };
  format?: string;
  defaultValue?: any;
  description?: string;
}

export interface DatasetSource {
  type: DatasetSourceType;
  connectionId?: string;
  table?: string;
  query?: string;
  queryId?: string;
  apiEndpoint?: string;
  filePath?: string;
  streamTopic?: string;
  joinedDatasets?: {
    leftDataset: string;
    rightDataset: string;
    joinType: 'inner' | 'left' | 'right' | 'full';
    joinConditions: {
      leftField: string;
      rightField: string;
    }[];
  };
}

export interface DatasetTransformation {
  id: string;
  type: 'filter' | 'map' | 'aggregate' | 'join' | 'pivot' | 'custom';
  config: Record<string, any>;
  order: number;
}

export interface DatasetRefreshConfig {
  enabled: boolean;
  schedule?: string; // Cron expression
  incremental: boolean;
  incrementalField?: string;
  lastRefresh?: Date;
  nextRefresh?: Date;
}

export interface DatasetMetadata {
  rowCount?: number;
  sizeInBytes?: number;
  lastModified?: Date;
  qualityScore?: number;
  tags?: string[];
  businessGlossary?: Record<string, string>;
}

export class Dataset {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly source: DatasetSource,
    public readonly schema: DatasetSchema[],
    public readonly status: DatasetStatus,
    public readonly createdBy: string,
    public readonly transformations: DatasetTransformation[],
    public readonly refreshConfig?: DatasetRefreshConfig,
    public readonly metadata?: DatasetMetadata,
    public readonly permissions?: {
      public: boolean;
      users?: string[];
      roles?: string[];
    },
    public readonly version: number = 1,
    public readonly parentDatasetId?: string,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date()
  ) {}

  static create(
    name: string,
    description: string,
    source: DatasetSource,
    createdBy: string,
    schema?: DatasetSchema[]
  ): Dataset {
    const id = `dataset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return new Dataset(
      id,
      name,
      description,
      source,
      schema || [],
      DatasetStatus.DRAFT,
      createdBy,
      []
    );
  }

  addTransformation(transformation: Omit<DatasetTransformation, 'id' | 'order'>): Dataset {
    const newTransformation: DatasetTransformation = {
      ...transformation,
      id: `transform-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      order: this.transformations.length
    };

    return new Dataset(
      this.id,
      this.name,
      this.description,
      this.source,
      this.schema,
      this.status,
      this.createdBy,
      [...this.transformations, newTransformation],
      this.refreshConfig,
      this.metadata,
      this.permissions,
      this.version,
      this.parentDatasetId,
      this.createdAt,
      new Date()
    );
  }

  removeTransformation(transformationId: string): Dataset {
    const updatedTransformations = this.transformations
      .filter(t => t.id !== transformationId)
      .map((t, index) => ({ ...t, order: index }));

    return new Dataset(
      this.id,
      this.name,
      this.description,
      this.source,
      this.schema,
      this.status,
      this.createdBy,
      updatedTransformations,
      this.refreshConfig,
      this.metadata,
      this.permissions,
      this.version,
      this.parentDatasetId,
      this.createdAt,
      new Date()
    );
  }

  updateSchema(schema: DatasetSchema[]): Dataset {
    return new Dataset(
      this.id,
      this.name,
      this.description,
      this.source,
      schema,
      this.status,
      this.createdBy,
      this.transformations,
      this.refreshConfig,
      this.metadata,
      this.permissions,
      this.version + 1,
      this.parentDatasetId,
      this.createdAt,
      new Date()
    );
  }

  updateStatus(status: DatasetStatus): Dataset {
    return new Dataset(
      this.id,
      this.name,
      this.description,
      this.source,
      this.schema,
      status,
      this.createdBy,
      this.transformations,
      this.refreshConfig,
      this.metadata,
      this.permissions,
      this.version,
      this.parentDatasetId,
      this.createdAt,
      new Date()
    );
  }

  updateMetadata(metadata: Partial<DatasetMetadata>): Dataset {
    return new Dataset(
      this.id,
      this.name,
      this.description,
      this.source,
      this.schema,
      this.status,
      this.createdBy,
      this.transformations,
      this.refreshConfig,
      { ...this.metadata, ...metadata },
      this.permissions,
      this.version,
      this.parentDatasetId,
      this.createdAt,
      new Date()
    );
  }

  setRefreshConfig(config: DatasetRefreshConfig): Dataset {
    return new Dataset(
      this.id,
      this.name,
      this.description,
      this.source,
      this.schema,
      this.status,
      this.createdBy,
      this.transformations,
      config,
      this.metadata,
      this.permissions,
      this.version,
      this.parentDatasetId,
      this.createdAt,
      new Date()
    );
  }

  createVersion(changes: Partial<Dataset>): Dataset {
    return new Dataset(
      `${this.id}-v${this.version + 1}`,
      changes.name || this.name,
      changes.description || this.description,
      changes.source || this.source,
      changes.schema || this.schema,
      DatasetStatus.DRAFT,
      this.createdBy,
      changes.transformations || this.transformations,
      changes.refreshConfig || this.refreshConfig,
      this.metadata,
      this.permissions,
      this.version + 1,
      this.id,
      new Date(),
      new Date()
    );
  }

  canUserAccess(userId: string, userRole?: string): boolean {
    if (!this.permissions) return true;
    if (this.permissions.public) return true;
    if (this.createdBy === userId) return true;
    
    if (this.permissions.users?.includes(userId)) return true;
    if (userRole && this.permissions.roles?.includes(userRole)) return true;
    
    return false;
  }

  needsRefresh(): boolean {
    if (!this.refreshConfig?.enabled) return false;
    if (!this.refreshConfig.lastRefresh) return true;
    
    const now = new Date();
    return this.refreshConfig.nextRefresh ? now >= this.refreshConfig.nextRefresh : false;
  }

  getFieldByName(fieldName: string): DatasetSchema | undefined {
    return this.schema.find(field => field.name === fieldName);
  }

  getPrimaryKeys(): DatasetSchema[] {
    return this.schema.filter(field => field.isPrimaryKey);
  }

  getForeignKeys(): DatasetSchema[] {
    return this.schema.filter(field => field.isForeignKey);
  }

  validateData(data: Record<string, any>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const field of this.schema) {
      const value = data[field.name];

      // Check required fields
      if (!field.nullable && (value === null || value === undefined)) {
        errors.push(`Field '${field.name}' is required`);
        continue;
      }

      // Skip validation for null/undefined values in nullable fields
      if (field.nullable && (value === null || value === undefined)) {
        continue;
      }

      // Type validation
      switch (field.type) {
        case DataType.STRING:
          if (typeof value !== 'string') {
            errors.push(`Field '${field.name}' must be a string`);
          }
          break;
        case DataType.NUMBER:
        case DataType.INTEGER:
        case DataType.DECIMAL:
          if (typeof value !== 'number') {
            errors.push(`Field '${field.name}' must be a number`);
          }
          break;
        case DataType.BOOLEAN:
          if (typeof value !== 'boolean') {
            errors.push(`Field '${field.name}' must be a boolean`);
          }
          break;
        case DataType.DATE:
        case DataType.DATETIME:
          if (!(value instanceof Date) && isNaN(Date.parse(value))) {
            errors.push(`Field '${field.name}' must be a valid date`);
          }
          break;
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}