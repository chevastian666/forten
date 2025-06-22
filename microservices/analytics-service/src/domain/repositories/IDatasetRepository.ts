import { Dataset, DatasetStatus, DatasetSourceType } from '../entities/Dataset';

export interface DatasetFilters {
  status?: DatasetStatus;
  sourceType?: DatasetSourceType;
  createdBy?: string;
  tags?: string[];
  name?: string;
  needsRefresh?: boolean;
}

export interface DatasetQueryOptions {
  fields?: string[];
  filters?: Record<string, any>;
  orderBy?: { field: string; direction: 'asc' | 'desc' }[];
  limit?: number;
  offset?: number;
}

export interface IDatasetRepository {
  findById(id: string): Promise<Dataset | null>;
  findAll(filters?: DatasetFilters, limit?: number, offset?: number): Promise<Dataset[]>;
  findByStatus(status: DatasetStatus): Promise<Dataset[]>;
  findBySourceType(sourceType: DatasetSourceType): Promise<Dataset[]>;
  findDatasetsToRefresh(): Promise<Dataset[]>;
  findByUser(userId: string): Promise<Dataset[]>;
  save(dataset: Dataset): Promise<Dataset>;
  update(dataset: Dataset): Promise<Dataset>;
  delete(id: string): Promise<boolean>;
  
  // Data operations
  getData(datasetId: string, options?: DatasetQueryOptions): Promise<any[]>;
  getDataCount(datasetId: string, filters?: Record<string, any>): Promise<number>;
  insertData(datasetId: string, data: any[]): Promise<boolean>;
  updateData(datasetId: string, filters: Record<string, any>, updates: Record<string, any>): Promise<number>;
  deleteData(datasetId: string, filters: Record<string, any>): Promise<number>;
  
  // Schema operations
  inferSchema(datasetId: string): Promise<Dataset>;
  validateSchema(datasetId: string): Promise<{ valid: boolean; errors?: string[] }>;
  
  // Version control
  findVersions(datasetId: string): Promise<Dataset[]>;
  getVersion(datasetId: string, version: number): Promise<Dataset | null>;
  promoteVersion(datasetId: string, version: number): Promise<Dataset>;
  
  // Transformation operations
  applyTransformations(datasetId: string): Promise<boolean>;
  previewTransformation(datasetId: string, transformationId: string, limit?: number): Promise<any[]>;
  
  // Access control
  findAccessibleByUser(userId: string, userRole?: string): Promise<Dataset[]>;
  checkAccess(datasetId: string, userId: string, userRole?: string): Promise<boolean>;
}