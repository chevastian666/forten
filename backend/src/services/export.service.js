/**
 * Data Export Service
 * Handles data export in CSV, Excel and PDF formats with filters
 */

const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { createObjectCsvWriter } = require('csv-writer');
const fs = require('fs').promises;
const path = require('path');
const { Op } = require('sequelize');

// Export configuration
const EXPORT_CONFIG = {
  MAX_RECORDS: 10000,
  TEMP_DIR: path.join(process.cwd(), 'temp', 'exports'),
  FORMATS: {
    CSV: 'csv',
    EXCEL: 'xlsx',
    PDF: 'pdf'
  },
  DEFAULT_TIMEZONE: 'America/Montevideo'
};

class ExportService {
  constructor() {
    this.ensureTempDirectory();
  }

  /**
   * Ensure temporary directory exists
   */
  async ensureTempDirectory() {
    try {
      await fs.mkdir(EXPORT_CONFIG.TEMP_DIR, { recursive: true });
    } catch (error) {
      console.error('Error creating temp directory:', error);
    }
  }

  /**
   * Export data based on format and filters
   */
  async exportData(format, dataType, filters = {}) {
    try {
      console.log(`📊 Starting export: ${format} format, ${dataType} data type`);
      
      // Validate format
      if (!Object.values(EXPORT_CONFIG.FORMATS).includes(format)) {
        throw new Error(`Invalid export format: ${format}`);
      }

      // Get filtered data
      const data = await this.getFilteredData(dataType, filters);
      
      if (data.length === 0) {
        throw new Error('No data found with the specified filters');
      }

      // Generate filename
      const filename = this.generateFilename(format, dataType);
      const filepath = path.join(EXPORT_CONFIG.TEMP_DIR, filename);

      // Export based on format
      let exportResult;
      switch (format) {
        case EXPORT_CONFIG.FORMATS.CSV:
          exportResult = await this.exportToCSV(filepath, data, dataType);
          break;
        case EXPORT_CONFIG.FORMATS.EXCEL:
          exportResult = await this.exportToExcel(filepath, data, dataType);
          break;
        case EXPORT_CONFIG.FORMATS.PDF:
          exportResult = await this.exportToPDF(filepath, data, dataType);
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      console.log(`✅ Export completed: ${filename}`);
      
      return {
        success: true,
        filename,
        filepath,
        recordCount: data.length,
        format,
        dataType,
        ...exportResult
      };

    } catch (error) {
      console.error('❌ Export error:', error);
      throw error;
    }
  }

  /**
   * Get filtered data based on type and filters
   */
  async getFilteredData(dataType, filters) {
    const { startDate, endDate, buildingId, eventType, limit = EXPORT_CONFIG.MAX_RECORDS } = filters;
    
    // Build where clause
    const whereClause = {};
    
    // Date filter
    if (startDate || endDate) {
      whereClause.created_at = {};
      if (startDate) {
        whereClause.created_at[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.created_at[Op.lte] = new Date(endDate);
      }
    }
    
    // Building filter
    if (buildingId) {
      whereClause.building_id = buildingId;
    }
    
    // Event type filter (for certain data types)
    if (eventType && ['events', 'alerts', 'access_logs'].includes(dataType)) {
      whereClause.event_type = eventType;
    }

    // Mock data generation based on data type
    // In production, replace with actual database queries
    const data = await this.getMockData(dataType, whereClause, limit);
    
    return data;
  }

  /**
   * Export data to CSV format
   */
  async exportToCSV(filepath, data, dataType) {
    try {
      const headers = this.getHeadersForDataType(dataType);
      
      const csvWriter = createObjectCsvWriter({
        path: filepath,
        header: headers.map(header => ({
          id: header.key,
          title: header.label
        }))
      });

      // Transform data for CSV
      const csvData = data.map(record => {
        const transformed = {};
        headers.forEach(header => {
          transformed[header.key] = this.formatValue(record[header.key], header.type);
        });
        return transformed;
      });

      await csvWriter.writeRecords(csvData);

      const stats = await fs.stat(filepath);
      
      return {
        fileSize: stats.size,
        mimeType: 'text/csv'
      };

    } catch (error) {
      console.error('CSV export error:', error);
      throw new Error(`Failed to export CSV: ${error.message}`);
    }
  }

  /**
   * Export data to Excel format
   */
  async exportToExcel(filepath, data, dataType) {
    try {
      const workbook = new ExcelJS.Workbook();
      
      // Set workbook properties
      workbook.creator = 'FORTEN CRM';
      workbook.lastModifiedBy = 'FORTEN Export Service';
      workbook.created = new Date();
      workbook.modified = new Date();
      
      // Add worksheet
      const worksheet = workbook.addWorksheet(this.getSheetName(dataType), {
        properties: { tabColor: { argb: '007bff' } }
      });

      // Get headers
      const headers = this.getHeadersForDataType(dataType);
      
      // Add headers
      worksheet.columns = headers.map(header => ({
        header: header.label,
        key: header.key,
        width: header.width || 15,
        style: {
          font: { bold: true },
          alignment: { horizontal: 'center' }
        }
      }));

      // Style header row
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '007bff' }
      };
      worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(1).height = 25;

      // Add data
      data.forEach((record, index) => {
        const row = worksheet.addRow(record);
        
        // Alternate row colors
        if (index % 2 === 0) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'F8F9FA' }
          };
        }
        
        // Format cells based on type
        headers.forEach(header => {
          const cell = row.getCell(header.key);
          this.formatExcelCell(cell, header.type, record[header.key]);
        });
      });

      // Add filters
      worksheet.autoFilter = {
        from: 'A1',
        to: `${String.fromCharCode(65 + headers.length - 1)}1`
      };

      // Freeze header row
      worksheet.views = [
        { state: 'frozen', xSplit: 0, ySplit: 1 }
      ];

      // Add summary sheet
      const summarySheet = workbook.addWorksheet('Summary');
      summarySheet.addRow(['Export Summary']);
      summarySheet.addRow(['']);
      summarySheet.addRow(['Data Type:', dataType]);
      summarySheet.addRow(['Total Records:', data.length]);
      summarySheet.addRow(['Export Date:', new Date().toLocaleString('es-UY')]);
      summarySheet.addRow(['']);
      
      // Style summary
      summarySheet.getCell('A1').font = { bold: true, size: 16 };
      summarySheet.getColumn(1).width = 20;
      summarySheet.getColumn(2).width = 30;

      // Save workbook
      await workbook.xlsx.writeFile(filepath);

      const stats = await fs.stat(filepath);
      
      return {
        fileSize: stats.size,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };

    } catch (error) {
      console.error('Excel export error:', error);
      throw new Error(`Failed to export Excel: ${error.message}`);
    }
  }

  /**
   * Export data to PDF format
   */
  async exportToPDF(filepath, data, dataType) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margin: 50,
          info: {
            Title: `FORTEN Export - ${dataType}`,
            Author: 'FORTEN CRM',
            Subject: `${dataType} Data Export`,
            Keywords: 'forten, export, data',
            CreationDate: new Date()
          }
        });

        // Pipe to file
        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        // Add header
        this.addPDFHeader(doc, dataType);

        // Add filters info if any
        this.addPDFFiltersInfo(doc, data.filters);

        // Add data table
        this.addPDFDataTable(doc, data, dataType);

        // Add footer
        this.addPDFFooter(doc);

        // Finalize PDF
        doc.end();

        stream.on('finish', async () => {
          try {
            const stats = await fs.stat(filepath);
            resolve({
              fileSize: stats.size,
              mimeType: 'application/pdf'
            });
          } catch (error) {
            reject(error);
          }
        });

        stream.on('error', reject);

      } catch (error) {
        console.error('PDF export error:', error);
        reject(new Error(`Failed to export PDF: ${error.message}`));
      }
    });
  }

  /**
   * Add PDF header
   */
  addPDFHeader(doc, dataType) {
    // Logo and title
    doc.fontSize(24)
       .fillColor('#007bff')
       .text('FORTEN', 50, 50);
    
    doc.fontSize(16)
       .fillColor('#333333')
       .text(`${this.getDataTypeTitle(dataType)} Export Report`, 150, 55);
    
    // Date
    doc.fontSize(10)
       .fillColor('#666666')
       .text(`Generated: ${new Date().toLocaleString('es-UY')}`, 50, 80);
    
    // Line separator
    doc.moveTo(50, 100)
       .lineTo(doc.page.width - 50, 100)
       .stroke('#cccccc');
    
    doc.moveDown(2);
  }

  /**
   * Add PDF filters info
   */
  addPDFFiltersInfo(doc, filters) {
    if (!filters || Object.keys(filters).length === 0) return;

    doc.fontSize(12)
       .fillColor('#333333')
       .text('Applied Filters:', 50, doc.y);
    
    doc.fontSize(10)
       .fillColor('#666666');
    
    if (filters.startDate || filters.endDate) {
      doc.text(`Date Range: ${filters.startDate || 'Start'} - ${filters.endDate || 'End'}`, 70, doc.y + 5);
    }
    
    if (filters.buildingId) {
      doc.text(`Building: ${filters.buildingId}`, 70, doc.y + 5);
    }
    
    if (filters.eventType) {
      doc.text(`Event Type: ${filters.eventType}`, 70, doc.y + 5);
    }
    
    doc.moveDown();
  }

  /**
   * Add PDF data table
   */
  addPDFDataTable(doc, data, dataType) {
    const headers = this.getHeadersForDataType(dataType);
    const tableTop = doc.y + 20;
    const itemHeight = 20;
    const maxItemsPerPage = Math.floor((doc.page.height - tableTop - 100) / itemHeight);
    
    let currentY = tableTop;
    let currentPage = 1;
    let itemsOnCurrentPage = 0;

    // Draw table headers
    const drawHeaders = () => {
      doc.fontSize(10)
         .fillColor('#ffffff');
      
      // Header background
      doc.rect(50, currentY - 5, doc.page.width - 100, itemHeight)
         .fill('#007bff');
      
      // Header text
      let currentX = 60;
      headers.forEach(header => {
        doc.fillColor('#ffffff')
           .text(header.label, currentX, currentY, {
             width: header.pdfWidth || 100,
             align: 'left'
           });
        currentX += header.pdfWidth || 100;
      });
      
      currentY += itemHeight;
    };

    // Draw initial headers
    drawHeaders();

    // Draw data rows
    data.slice(0, EXPORT_CONFIG.MAX_RECORDS).forEach((record, index) => {
      if (itemsOnCurrentPage >= maxItemsPerPage) {
        // Add new page
        doc.addPage();
        currentY = 50;
        currentPage++;
        itemsOnCurrentPage = 0;
        
        // Redraw headers on new page
        drawHeaders();
      }

      // Alternate row colors
      if (index % 2 === 0) {
        doc.rect(50, currentY - 5, doc.page.width - 100, itemHeight)
           .fill('#f8f9fa');
      }

      // Row data
      let currentX = 60;
      headers.forEach(header => {
        const value = this.formatValue(record[header.key], header.type);
        doc.fillColor('#333333')
           .fontSize(9)
           .text(value || '', currentX, currentY, {
             width: header.pdfWidth || 100,
             align: 'left'
           });
        currentX += header.pdfWidth || 100;
      });

      currentY += itemHeight;
      itemsOnCurrentPage++;
    });

    // Summary
    doc.moveDown(2);
    doc.fontSize(10)
       .fillColor('#666666')
       .text(`Total Records: ${data.length} (Showing ${Math.min(data.length, EXPORT_CONFIG.MAX_RECORDS)})`, 50, doc.y);
  }

  /**
   * Add PDF footer
   */
  addPDFFooter(doc) {
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      
      // Footer line
      doc.moveTo(50, doc.page.height - 50)
         .lineTo(doc.page.width - 50, doc.page.height - 50)
         .stroke('#cccccc');
      
      // Footer text
      doc.fontSize(8)
         .fillColor('#666666')
         .text(
           `Page ${i + 1} of ${pages.count}`,
           50,
           doc.page.height - 40,
           { align: 'center', width: doc.page.width - 100 }
         );
      
      doc.text(
        'FORTEN CRM - Confidential',
        50,
        doc.page.height - 30,
        { align: 'right', width: doc.page.width - 100 }
      );
    }
  }

  /**
   * Get headers configuration for data type
   */
  getHeadersForDataType(dataType) {
    const headerConfigs = {
      events: [
        { key: 'id', label: 'ID', type: 'string', width: 15, pdfWidth: 60 },
        { key: 'event_type', label: 'Event Type', type: 'string', width: 20, pdfWidth: 100 },
        { key: 'building_name', label: 'Building', type: 'string', width: 25, pdfWidth: 120 },
        { key: 'user_name', label: 'User', type: 'string', width: 25, pdfWidth: 120 },
        { key: 'description', label: 'Description', type: 'string', width: 40, pdfWidth: 150 },
        { key: 'created_at', label: 'Date', type: 'datetime', width: 20, pdfWidth: 100 }
      ],
      access_logs: [
        { key: 'id', label: 'ID', type: 'string', width: 15, pdfWidth: 60 },
        { key: 'user_name', label: 'User', type: 'string', width: 25, pdfWidth: 120 },
        { key: 'building_name', label: 'Building', type: 'string', width: 25, pdfWidth: 120 },
        { key: 'entry_point', label: 'Entry Point', type: 'string', width: 20, pdfWidth: 100 },
        { key: 'access_type', label: 'Access Type', type: 'string', width: 20, pdfWidth: 100 },
        { key: 'status', label: 'Status', type: 'string', width: 15, pdfWidth: 80 },
        { key: 'timestamp', label: 'Timestamp', type: 'datetime', width: 20, pdfWidth: 100 }
      ],
      alerts: [
        { key: 'id', label: 'ID', type: 'string', width: 15, pdfWidth: 60 },
        { key: 'alert_type', label: 'Alert Type', type: 'string', width: 20, pdfWidth: 100 },
        { key: 'severity', label: 'Severity', type: 'string', width: 15, pdfWidth: 80 },
        { key: 'building_name', label: 'Building', type: 'string', width: 25, pdfWidth: 120 },
        { key: 'description', label: 'Description', type: 'string', width: 40, pdfWidth: 150 },
        { key: 'status', label: 'Status', type: 'string', width: 15, pdfWidth: 80 },
        { key: 'created_at', label: 'Created', type: 'datetime', width: 20, pdfWidth: 100 }
      ],
      devices: [
        { key: 'id', label: 'ID', type: 'string', width: 15, pdfWidth: 60 },
        { key: 'device_name', label: 'Device Name', type: 'string', width: 25, pdfWidth: 120 },
        { key: 'device_type', label: 'Type', type: 'string', width: 20, pdfWidth: 100 },
        { key: 'building_name', label: 'Building', type: 'string', width: 25, pdfWidth: 120 },
        { key: 'status', label: 'Status', type: 'string', width: 15, pdfWidth: 80 },
        { key: 'last_seen', label: 'Last Seen', type: 'datetime', width: 20, pdfWidth: 100 },
        { key: 'ip_address', label: 'IP Address', type: 'string', width: 20, pdfWidth: 100 }
      ],
      users: [
        { key: 'id', label: 'ID', type: 'string', width: 15, pdfWidth: 60 },
        { key: 'first_name', label: 'First Name', type: 'string', width: 20, pdfWidth: 100 },
        { key: 'last_name', label: 'Last Name', type: 'string', width: 20, pdfWidth: 100 },
        { key: 'email', label: 'Email', type: 'string', width: 30, pdfWidth: 150 },
        { key: 'role', label: 'Role', type: 'string', width: 15, pdfWidth: 80 },
        { key: 'status', label: 'Status', type: 'string', width: 15, pdfWidth: 80 },
        { key: 'created_at', label: 'Created', type: 'datetime', width: 20, pdfWidth: 100 }
      ]
    };

    return headerConfigs[dataType] || headerConfigs.events;
  }

  /**
   * Format cell value based on type
   */
  formatValue(value, type) {
    if (value === null || value === undefined) return '';
    
    switch (type) {
      case 'datetime':
        return value ? new Date(value).toLocaleString('es-UY') : '';
      case 'date':
        return value ? new Date(value).toLocaleDateString('es-UY') : '';
      case 'boolean':
        return value ? 'Yes' : 'No';
      case 'number':
        return Number(value).toLocaleString('es-UY');
      default:
        return String(value);
    }
  }

  /**
   * Format Excel cell based on type
   */
  formatExcelCell(cell, type, value) {
    switch (type) {
      case 'datetime':
        cell.numFmt = 'dd/mm/yyyy hh:mm:ss';
        break;
      case 'date':
        cell.numFmt = 'dd/mm/yyyy';
        break;
      case 'number':
        cell.numFmt = '#,##0';
        break;
      case 'currency':
        cell.numFmt = '$#,##0.00';
        break;
    }
  }

  /**
   * Generate filename
   */
  generateFilename(format, dataType) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    return `forten_${dataType}_export_${timestamp}.${format}`;
  }

  /**
   * Get sheet name for Excel
   */
  getSheetName(dataType) {
    const names = {
      events: 'Events',
      access_logs: 'Access Logs',
      alerts: 'Security Alerts',
      devices: 'Devices',
      users: 'Users'
    };
    return names[dataType] || 'Data';
  }

  /**
   * Get data type title
   */
  getDataTypeTitle(dataType) {
    const titles = {
      events: 'System Events',
      access_logs: 'Access Logs',
      alerts: 'Security Alerts',
      devices: 'Device Status',
      users: 'User List'
    };
    return titles[dataType] || 'Data';
  }

  /**
   * Get mock data for testing
   * In production, replace with actual database queries
   */
  async getMockData(dataType, whereClause, limit) {
    const mockData = {
      events: this.generateMockEvents(limit),
      access_logs: this.generateMockAccessLogs(limit),
      alerts: this.generateMockAlerts(limit),
      devices: this.generateMockDevices(Math.min(limit, 100)),
      users: this.generateMockUsers(Math.min(limit, 500))
    };

    return mockData[dataType] || [];
  }

  /**
   * Generate mock events
   */
  generateMockEvents(count) {
    const eventTypes = ['system_start', 'system_stop', 'config_change', 'user_login', 'user_logout'];
    const buildings = ['Building A', 'Building B', 'Building C'];
    const users = ['Admin User', 'John Doe', 'Jane Smith', 'Carlos Rodriguez'];
    
    return Array.from({ length: Math.min(count, EXPORT_CONFIG.MAX_RECORDS) }, (_, i) => ({
      id: `EVT-${String(i + 1).padStart(6, '0')}`,
      event_type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
      building_name: buildings[Math.floor(Math.random() * buildings.length)],
      user_name: users[Math.floor(Math.random() * users.length)],
      description: `Event description for event ${i + 1}`,
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
    }));
  }

  /**
   * Generate mock access logs
   */
  generateMockAccessLogs(count) {
    const buildings = ['Building A', 'Building B', 'Building C'];
    const entryPoints = ['Main Entrance', 'Parking Gate', 'Emergency Exit', 'Side Door'];
    const accessTypes = ['Card', 'PIN', 'Biometric', 'Remote'];
    const statuses = ['Granted', 'Denied', 'Expired', 'Invalid'];
    const users = ['John Doe', 'Jane Smith', 'Carlos Rodriguez', 'Maria Garcia'];
    
    return Array.from({ length: Math.min(count, EXPORT_CONFIG.MAX_RECORDS) }, (_, i) => ({
      id: `ACC-${String(i + 1).padStart(6, '0')}`,
      user_name: users[Math.floor(Math.random() * users.length)],
      building_name: buildings[Math.floor(Math.random() * buildings.length)],
      entry_point: entryPoints[Math.floor(Math.random() * entryPoints.length)],
      access_type: accessTypes[Math.floor(Math.random() * accessTypes.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
    }));
  }

  /**
   * Generate mock alerts
   */
  generateMockAlerts(count) {
    const alertTypes = ['motion_detected', 'door_forced', 'camera_offline', 'unauthorized_access'];
    const severities = ['Critical', 'High', 'Medium', 'Low'];
    const buildings = ['Building A', 'Building B', 'Building C'];
    const statuses = ['Active', 'Acknowledged', 'Resolved', 'False Positive'];
    
    return Array.from({ length: Math.min(count, EXPORT_CONFIG.MAX_RECORDS) }, (_, i) => ({
      id: `ALT-${String(i + 1).padStart(6, '0')}`,
      alert_type: alertTypes[Math.floor(Math.random() * alertTypes.length)],
      severity: severities[Math.floor(Math.random() * severities.length)],
      building_name: buildings[Math.floor(Math.random() * buildings.length)],
      description: `Alert description for alert ${i + 1}`,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      created_at: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000)
    }));
  }

  /**
   * Generate mock devices
   */
  generateMockDevices(count) {
    const deviceTypes = ['Camera', 'Access Controller', 'Motion Sensor', 'Door Sensor'];
    const buildings = ['Building A', 'Building B', 'Building C'];
    const statuses = ['Online', 'Offline', 'Maintenance', 'Error'];
    
    return Array.from({ length: count }, (_, i) => ({
      id: `DEV-${String(i + 1).padStart(4, '0')}`,
      device_name: `${deviceTypes[i % deviceTypes.length]} ${i + 1}`,
      device_type: deviceTypes[i % deviceTypes.length],
      building_name: buildings[Math.floor(Math.random() * buildings.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      last_seen: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
      ip_address: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
    }));
  }

  /**
   * Generate mock users
   */
  generateMockUsers(count) {
    const firstNames = ['John', 'Jane', 'Carlos', 'Maria', 'Luis', 'Ana', 'Pedro', 'Sofia'];
    const lastNames = ['Doe', 'Smith', 'Rodriguez', 'Garcia', 'Martinez', 'Lopez', 'Gonzalez'];
    const roles = ['admin', 'operator', 'security', 'viewer'];
    const statuses = ['active', 'inactive', 'suspended'];
    
    return Array.from({ length: count }, (_, i) => {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      
      return {
        id: `USR-${String(i + 1).padStart(4, '0')}`,
        first_name: firstName,
        last_name: lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@forten.com.uy`,
        role: roles[Math.floor(Math.random() * roles.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
      };
    });
  }

  /**
   * Clean up old export files (older than 24 hours)
   */
  async cleanupOldExports() {
    try {
      const files = await fs.readdir(EXPORT_CONFIG.TEMP_DIR);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      for (const file of files) {
        const filepath = path.join(EXPORT_CONFIG.TEMP_DIR, file);
        const stats = await fs.stat(filepath);
        
        if (now - stats.mtimeMs > maxAge) {
          await fs.unlink(filepath);
          console.log(`🧹 Deleted old export file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old exports:', error);
    }
  }
}

// Create singleton instance
const exportService = new ExportService();

// Schedule cleanup every hour
setInterval(() => {
  exportService.cleanupOldExports();
}, 60 * 60 * 1000);

module.exports = exportService;