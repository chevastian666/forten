import { parse } from 'json2csv';
import { Logger } from '@infrastructure/logging/Logger';

export interface CSVExportOptions {
  fields?: string[];
  delimiter?: string;
  quote?: string;
  header?: boolean;
  includeEmptyRows?: boolean;
}

export class CSVExportService {
  constructor(private readonly logger: Logger) {}

  async generateReport(data: any, options?: CSVExportOptions): Promise<Buffer> {
    try {
      // Handle different data structures
      let csvData: any[] = [];
      
      if (data.data) {
        // Extract data from report structure
        for (const [key, value] of Object.entries(data.data)) {
          if (Array.isArray(value) && value.length > 0) {
            // Add a section header
            if (csvData.length > 0) {
              csvData.push({}); // Empty row for separation
            }
            csvData.push({ _section: key.toUpperCase() });
            csvData.push(...value);
          }
        }
      } else if (Array.isArray(data)) {
        csvData = data;
      } else {
        csvData = [data];
      }

      if (csvData.length === 0) {
        return Buffer.from('No data available');
      }

      // Extract fields if not specified
      let fields = options?.fields;
      if (!fields) {
        fields = this.extractFields(csvData);
      }

      // Generate CSV
      const csv = parse(csvData, {
        fields,
        delimiter: options?.delimiter || ',',
        quote: options?.quote || '"',
        header: options?.header !== false,
        includeEmptyRows: options?.includeEmptyRows || false
      });

      return Buffer.from(csv, 'utf-8');
    } catch (error) {
      this.logger.error('Failed to generate CSV', error);
      throw new Error('CSV generation failed');
    }
  }

  async exportDataset(
    data: any[],
    columns?: { field: string; label: string }[],
    options?: CSVExportOptions
  ): Promise<Buffer> {
    if (!data || data.length === 0) {
      return Buffer.from('No data available');
    }

    try {
      let fields: any;
      
      if (columns && columns.length > 0) {
        // Use specified columns with custom labels
        fields = columns.map(col => ({
          value: col.field,
          label: col.label
        }));
      } else {
        // Auto-detect fields
        fields = this.extractFields(data);
      }

      const csv = parse(data, {
        fields,
        delimiter: options?.delimiter || ',',
        quote: options?.quote || '"',
        header: options?.header !== false
      });

      return Buffer.from(csv, 'utf-8');
    } catch (error) {
      this.logger.error('Failed to export dataset to CSV', error);
      throw new Error('CSV export failed');
    }
  }

  async generatePivotCSV(
    data: any[],
    pivotConfig: {
      rows: string[];
      columns: string[];
      values: { field: string; aggregation: string }[];
    },
    options?: CSVExportOptions
  ): Promise<Buffer> {
    try {
      // Create pivot data structure
      const pivotData = this.createPivotData(data, pivotConfig);
      
      // Convert to CSV
      const csv = parse(pivotData, {
        delimiter: options?.delimiter || ',',
        quote: options?.quote || '"',
        header: options?.header !== false
      });

      return Buffer.from(csv, 'utf-8');
    } catch (error) {
      this.logger.error('Failed to generate pivot CSV', error);
      throw new Error('Pivot CSV generation failed');
    }
  }

  private extractFields(data: any[]): string[] {
    const fieldsSet = new Set<string>();
    
    // Collect all unique fields from all objects
    data.forEach(item => {
      if (item && typeof item === 'object') {
        Object.keys(item).forEach(key => {
          if (!key.startsWith('_')) { // Skip internal fields
            fieldsSet.add(key);
          }
        });
      }
    });

    return Array.from(fieldsSet);
  }

  private createPivotData(
    data: any[],
    config: {
      rows: string[];
      columns: string[];
      values: { field: string; aggregation: string }[];
    }
  ): any[] {
    const pivotMap = new Map<string, Map<string, any>>();
    const columnValues = new Set<string>();

    // First pass: collect all unique column values and group data
    data.forEach(record => {
      const rowKey = config.rows.map(field => record[field]).join('|');
      const colKey = config.columns.map(field => record[field]).join('|');
      
      columnValues.add(colKey);
      
      if (!pivotMap.has(rowKey)) {
        pivotMap.set(rowKey, new Map());
      }
      
      const rowData = pivotMap.get(rowKey)!;
      if (!rowData.has(colKey)) {
        rowData.set(colKey, []);
      }
      
      rowData.get(colKey)!.push(record);
    });

    // Second pass: create pivot table
    const result: any[] = [];
    const sortedColumns = Array.from(columnValues).sort();

    pivotMap.forEach((colData, rowKey) => {
      const row: any = {};
      
      // Add row fields
      const rowValues = rowKey.split('|');
      config.rows.forEach((field, index) => {
        row[field] = rowValues[index];
      });

      // Add aggregated values for each column
      sortedColumns.forEach(colKey => {
        const records = colData.get(colKey) || [];
        
        config.values.forEach(valueConfig => {
          const columnName = `${colKey}_${valueConfig.field}_${valueConfig.aggregation}`;
          row[columnName] = this.aggregate(
            records.map(r => r[valueConfig.field]),
            valueConfig.aggregation
          );
        });
      });

      result.push(row);
    });

    return result;
  }

  private aggregate(values: any[], aggregation: string): any {
    const numericValues = values
      .filter(v => v !== null && v !== undefined)
      .map(v => Number(v))
      .filter(v => !isNaN(v));

    switch (aggregation) {
      case 'sum':
        return numericValues.reduce((a, b) => a + b, 0);
      case 'avg':
        return numericValues.length > 0 
          ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length 
          : 0;
      case 'min':
        return numericValues.length > 0 ? Math.min(...numericValues) : null;
      case 'max':
        return numericValues.length > 0 ? Math.max(...numericValues) : null;
      case 'count':
        return values.length;
      case 'distinct':
        return new Set(values).size;
      default:
        return null;
    }
  }

  formatCSVValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    
    if (value instanceof Date) {
      return value.toISOString();
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return String(value);
  }

  async streamLargeDataset(
    dataGenerator: AsyncGenerator<any[], void, unknown>,
    options?: CSVExportOptions
  ): Promise<NodeJS.ReadableStream> {
    const { Readable } = require('stream');
    
    const stream = new Readable({
      read() {}
    });

    let isFirstBatch = true;
    let fields: string[] | undefined = options?.fields;

    (async () => {
      try {
        for await (const batch of dataGenerator) {
          if (batch.length === 0) continue;

          // Extract fields from first batch if not specified
          if (!fields && isFirstBatch) {
            fields = this.extractFields(batch);
          }

          const csvOptions = {
            fields,
            delimiter: options?.delimiter || ',',
            quote: options?.quote || '"',
            header: isFirstBatch && options?.header !== false,
            includeEmptyRows: options?.includeEmptyRows || false
          };

          const csv = parse(batch, csvOptions);
          stream.push(csv + '\n');

          isFirstBatch = false;
        }

        stream.push(null); // End the stream
      } catch (error) {
        stream.destroy(error as Error);
      }
    })();

    return stream;
  }
}