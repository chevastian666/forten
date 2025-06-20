import ExcelJS from 'exceljs';
import { Logger } from '@infrastructure/logging/Logger';

export interface ExcelExportOptions {
  sheetName?: string;
  includeHeaders?: boolean;
  autoFilter?: boolean;
  freezeRow?: number;
  columnWidths?: Record<string, number>;
  styles?: {
    headerStyle?: Partial<ExcelJS.Style>;
    dataStyle?: Partial<ExcelJS.Style>;
    alternateRowStyle?: Partial<ExcelJS.Style>;
  };
}

export class ExcelExportService {
  constructor(private readonly logger: Logger) {}

  async generateReport(data: any, options?: ExcelExportOptions): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    
    // Set workbook properties
    workbook.creator = 'Forten CRM Analytics';
    workbook.lastModifiedBy = 'System';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Process data sections
    if (data.report) {
      this.addReportSummarySheet(workbook, data.report);
    }

    if (data.data) {
      for (const [key, value] of Object.entries(data.data)) {
        if (Array.isArray(value) && value.length > 0) {
          this.addDataSheet(workbook, key, value, options);
        }
      }
    }

    return workbook.xlsx.writeBuffer() as Promise<Buffer>;
  }

  async exportDataset(
    data: any[],
    columns: { key: string; header: string; type?: string }[],
    options?: ExcelExportOptions
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(options?.sheetName || 'Data');

    // Add columns
    worksheet.columns = columns.map(col => ({
      header: col.header,
      key: col.key,
      width: options?.columnWidths?.[col.key] || 15
    }));

    // Add data
    worksheet.addRows(data);

    // Apply styles
    this.applyStyles(worksheet, options);

    // Auto filter
    if (options?.autoFilter !== false) {
      worksheet.autoFilter = {
        from: 'A1',
        to: `${this.getColumnLetter(columns.length)}1`
      };
    }

    // Freeze rows
    if (options?.freezeRow) {
      worksheet.views = [{
        state: 'frozen',
        ySplit: options.freezeRow
      }];
    }

    return workbook.xlsx.writeBuffer() as Promise<Buffer>;
  }

  async generatePivotTable(
    data: any[],
    pivotConfig: {
      rows: string[];
      columns: string[];
      values: { field: string; aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max' }[];
    }
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    
    // Add source data sheet
    const dataSheet = workbook.addWorksheet('Source Data');
    if (data.length > 0) {
      const columns = Object.keys(data[0]);
      dataSheet.columns = columns.map(col => ({
        header: col,
        key: col,
        width: 15
      }));
      dataSheet.addRows(data);
    }

    // Create pivot data
    const pivotData = this.calculatePivotData(data, pivotConfig);
    
    // Add pivot sheet
    const pivotSheet = workbook.addWorksheet('Pivot Table');
    if (pivotData.length > 0) {
      const pivotColumns = Object.keys(pivotData[0]);
      pivotSheet.columns = pivotColumns.map(col => ({
        header: col,
        key: col,
        width: 20
      }));
      pivotSheet.addRows(pivotData);
      
      // Apply pivot table styling
      this.applyPivotStyles(pivotSheet);
    }

    return workbook.xlsx.writeBuffer() as Promise<Buffer>;
  }

  private addReportSummarySheet(workbook: ExcelJS.Workbook, report: any): void {
    const worksheet = workbook.addWorksheet('Summary');

    // Report title
    worksheet.mergeCells('A1:E1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = report.name;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };

    // Report description
    worksheet.mergeCells('A2:E2');
    const descCell = worksheet.getCell('A2');
    descCell.value = report.description;
    descCell.alignment = { horizontal: 'center' };

    // Report metadata
    worksheet.getCell('A4').value = 'Generated At:';
    worksheet.getCell('B4').value = new Date();
    worksheet.getCell('A5').value = 'Report Type:';
    worksheet.getCell('B5').value = report.type;
    worksheet.getCell('A6').value = 'Date Range:';
    worksheet.getCell('B6').value = `${new Date(report.parameters.startDate).toLocaleDateString()} - ${new Date(report.parameters.endDate).toLocaleDateString()}`;

    // Style metadata
    worksheet.getColumn('A').width = 20;
    worksheet.getColumn('B').width = 30;
    
    const metadataRange = worksheet.getRows(4, 3);
    metadataRange?.forEach(row => {
      row.getCell(1).font = { bold: true };
    });
  }

  private addDataSheet(
    workbook: ExcelJS.Workbook,
    sheetName: string,
    data: any[],
    options?: ExcelExportOptions
  ): void {
    const worksheet = workbook.addWorksheet(this.sanitizeSheetName(sheetName));

    if (data.length === 0) return;

    // Extract columns from first row
    const columns = Object.keys(data[0]).map(key => ({
      header: this.formatHeader(key),
      key: key,
      width: options?.columnWidths?.[key] || this.calculateColumnWidth(key, data)
    }));

    worksheet.columns = columns;

    // Add data
    data.forEach((row, index) => {
      const excelRow = worksheet.addRow(row);
      
      // Apply alternating row styles
      if (options?.styles?.alternateRowStyle && index % 2 === 1) {
        excelRow.eachCell(cell => {
          Object.assign(cell, options.styles!.alternateRowStyle);
        });
      }
    });

    // Apply styles
    this.applyStyles(worksheet, options);

    // Add conditional formatting for numeric columns
    columns.forEach((col, colIndex) => {
      if (this.isNumericColumn(data, col.key)) {
        const colLetter = this.getColumnLetter(colIndex + 1);
        worksheet.addConditionalFormatting({
          ref: `${colLetter}2:${colLetter}${data.length + 1}`,
          rules: [
            {
              type: 'dataBar',
              minLength: 0,
              maxLength: 100,
              color: '638EC6',
              showValue: true
            }
          ]
        });
      }
    });

    // Auto filter
    if (options?.autoFilter !== false) {
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: columns.length }
      };
    }

    // Freeze first row
    if (options?.freezeRow !== false) {
      worksheet.views = [{
        state: 'frozen',
        ySplit: 1
      }];
    }
  }

  private applyStyles(worksheet: ExcelJS.Worksheet, options?: ExcelExportOptions): void {
    // Header row styling
    const headerRow = worksheet.getRow(1);
    headerRow.font = options?.styles?.headerStyle?.font || { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = options?.styles?.headerStyle?.fill || {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4472C4' }
    };
    headerRow.alignment = options?.styles?.headerStyle?.alignment || { 
      vertical: 'middle', 
      horizontal: 'center' 
    };
    headerRow.height = 25;

    // Apply borders to all cells
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Apply number format to numeric cells
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.eachCell((cell, colNumber) => {
          if (typeof cell.value === 'number') {
            if (cell.value % 1 === 0) {
              cell.numFmt = '#,##0';
            } else {
              cell.numFmt = '#,##0.00';
            }
          } else if (cell.value instanceof Date) {
            cell.numFmt = 'yyyy-mm-dd';
          }
        });
      }
    });
  }

  private applyPivotStyles(worksheet: ExcelJS.Worksheet): void {
    // Style pivot table headers
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '2F75B5' }
    };
    headerRow.height = 30;

    // Apply subtotal styling
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };

        // Highlight subtotal rows
        if (cell.value?.toString().includes('Total')) {
          row.font = { bold: true };
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'E7E6E6' }
          };
        }
      });
    });
  }

  private calculatePivotData(
    data: any[],
    config: {
      rows: string[];
      columns: string[];
      values: { field: string; aggregation: string }[];
    }
  ): any[] {
    // Simple pivot calculation - in production, this would be more sophisticated
    const pivotMap = new Map<string, any>();

    data.forEach(record => {
      const rowKey = config.rows.map(r => record[r]).join('|');
      
      if (!pivotMap.has(rowKey)) {
        const pivotRow: any = {};
        config.rows.forEach(r => pivotRow[r] = record[r]);
        config.values.forEach(v => {
          pivotRow[`${v.aggregation}_${v.field}`] = 0;
          pivotRow[`count_${v.field}`] = 0;
        });
        pivotMap.set(rowKey, pivotRow);
      }

      const pivotRow = pivotMap.get(rowKey);
      config.values.forEach(v => {
        switch (v.aggregation) {
          case 'sum':
            pivotRow[`${v.aggregation}_${v.field}`] += record[v.field] || 0;
            break;
          case 'count':
            pivotRow[`${v.aggregation}_${v.field}`] += 1;
            break;
          case 'avg':
            pivotRow[`sum_${v.field}`] = (pivotRow[`sum_${v.field}`] || 0) + (record[v.field] || 0);
            pivotRow[`count_${v.field}`] += 1;
            pivotRow[`${v.aggregation}_${v.field}`] = pivotRow[`sum_${v.field}`] / pivotRow[`count_${v.field}`];
            break;
        }
      });
    });

    return Array.from(pivotMap.values());
  }

  private formatHeader(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  private sanitizeSheetName(name: string): string {
    // Excel sheet names have restrictions
    return name
      .replace(/[\\/:*?[\]]/g, '')
      .substring(0, 31);
  }

  private calculateColumnWidth(key: string, data: any[]): number {
    const headerLength = this.formatHeader(key).length;
    const maxDataLength = Math.max(
      ...data.slice(0, 100).map(row => String(row[key] || '').length)
    );
    return Math.min(Math.max(headerLength, maxDataLength) + 2, 50);
  }

  private isNumericColumn(data: any[], key: string): boolean {
    return data.slice(0, 10).every(row => 
      typeof row[key] === 'number' || row[key] === null || row[key] === undefined
    );
  }

  private getColumnLetter(columnNumber: number): string {
    let letter = '';
    while (columnNumber > 0) {
      columnNumber--;
      letter = String.fromCharCode(65 + (columnNumber % 26)) + letter;
      columnNumber = Math.floor(columnNumber / 26);
    }
    return letter;
  }
}