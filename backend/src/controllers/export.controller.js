/**
 * Export Controller
 * Handles data export requests with validation and access control
 */

const exportService = require('../services/export.service');
const { validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs').promises;

// Valid export formats
const VALID_FORMATS = ['csv', 'xlsx', 'pdf'];

// Valid data types
const VALID_DATA_TYPES = ['events', 'access_logs', 'alerts', 'devices', 'users'];

class ExportController {
  /**
   * Export data in specified format
   * GET /api/export/:dataType/:format
   */
  async exportData(req, res) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { dataType, format } = req.params;
      const filters = this.extractFilters(req.query);

      console.log(`📊 Export request: ${dataType} in ${format} format`);
      console.log(`📊 Filters:`, filters);

      // Validate format
      if (!VALID_FORMATS.includes(format)) {
        return res.status(400).json({
          success: false,
          message: `Invalid format. Valid formats: ${VALID_FORMATS.join(', ')}`
        });
      }

      // Validate data type
      if (!VALID_DATA_TYPES.includes(dataType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid data type. Valid types: ${VALID_DATA_TYPES.join(', ')}`
        });
      }

      // Check user permissions based on data type
      if (!this.hasExportPermission(req.user, dataType)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to export this data type'
        });
      }

      // Log export request for audit
      this.logExportRequest(req.user, dataType, format, filters);

      // Perform export
      const exportResult = await exportService.exportData(format, dataType, filters);

      // Send file as response
      await this.sendFileResponse(res, exportResult);

    } catch (error) {
      console.error('❌ Export controller error:', error);
      
      // Handle specific errors
      if (error.message === 'No data found with the specified filters') {
        return res.status(404).json({
          success: false,
          message: 'No data found with the specified filters'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to export data',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get available export options
   * GET /api/export/options
   */
  async getExportOptions(req, res) {
    try {
      // Get user's available data types based on permissions
      const availableDataTypes = VALID_DATA_TYPES.filter(type => 
        this.hasExportPermission(req.user, type)
      );

      const options = {
        formats: VALID_FORMATS.map(format => ({
          value: format,
          label: format.toUpperCase(),
          mimeType: this.getMimeType(format),
          description: this.getFormatDescription(format)
        })),
        dataTypes: availableDataTypes.map(type => ({
          value: type,
          label: this.getDataTypeLabel(type),
          description: this.getDataTypeDescription(type),
          filters: this.getAvailableFilters(type)
        })),
        maxRecords: 10000,
        filters: {
          dateRange: {
            enabled: true,
            defaultDays: 30
          },
          building: {
            enabled: true,
            values: await this.getAvailableBuildings(req.user)
          },
          eventType: {
            enabled: true,
            values: this.getEventTypes()
          }
        }
      };

      res.json({
        success: true,
        data: options
      });

    } catch (error) {
      console.error('❌ Get export options error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get export options',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get export history
   * GET /api/export/history
   */
  async getExportHistory(req, res) {
    try {
      // Mock export history - in production, fetch from database
      const history = [
        {
          id: '1',
          dataType: 'events',
          format: 'xlsx',
          recordCount: 1532,
          fileSize: '245 KB',
          createdBy: req.user.email,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          filters: { startDate: '2024-12-01', endDate: '2024-12-20' }
        },
        {
          id: '2',
          dataType: 'access_logs',
          format: 'pdf',
          recordCount: 856,
          fileSize: '189 KB',
          createdBy: req.user.email,
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          filters: { buildingId: 'building-1' }
        },
        {
          id: '3',
          dataType: 'alerts',
          format: 'csv',
          recordCount: 234,
          fileSize: '45 KB',
          createdBy: req.user.email,
          createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
          filters: { eventType: 'security_alert' }
        }
      ];

      res.json({
        success: true,
        data: history,
        count: history.length
      });

    } catch (error) {
      console.error('❌ Get export history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get export history',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Preview export data
   * POST /api/export/preview
   */
  async previewExport(req, res) {
    try {
      const { dataType, filters } = req.body;

      // Validate data type
      if (!VALID_DATA_TYPES.includes(dataType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid data type. Valid types: ${VALID_DATA_TYPES.join(', ')}`
        });
      }

      // Check permissions
      if (!this.hasExportPermission(req.user, dataType)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to preview this data type'
        });
      }

      // Get limited preview data
      const previewFilters = {
        ...this.extractFilters(filters),
        limit: 10 // Only show 10 records in preview
      };

      // Get data through service (reuse the mock data generation)
      const data = await exportService.getFilteredData(dataType, previewFilters);
      const totalCount = await this.getTotalCount(dataType, filters);

      res.json({
        success: true,
        data: {
          records: data,
          totalCount,
          previewCount: data.length,
          headers: exportService.getHeadersForDataType(dataType)
        }
      });

    } catch (error) {
      console.error('❌ Preview export error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to preview export data',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Extract and validate filters from request
   */
  extractFilters(query) {
    const filters = {};

    // Date filters
    if (query.startDate) {
      const startDate = new Date(query.startDate);
      if (!isNaN(startDate)) {
        filters.startDate = startDate.toISOString();
      }
    }

    if (query.endDate) {
      const endDate = new Date(query.endDate);
      if (!isNaN(endDate)) {
        // Set to end of day
        endDate.setHours(23, 59, 59, 999);
        filters.endDate = endDate.toISOString();
      }
    }

    // Building filter
    if (query.buildingId && query.buildingId !== 'all') {
      filters.buildingId = query.buildingId;
    }

    // Event type filter
    if (query.eventType && query.eventType !== 'all') {
      filters.eventType = query.eventType;
    }

    // Limit filter (max 10000)
    if (query.limit) {
      filters.limit = Math.min(parseInt(query.limit) || 10000, 10000);
    }

    return filters;
  }

  /**
   * Check if user has permission to export specific data type
   */
  hasExportPermission(user, dataType) {
    if (!user) return false;

    // Admin can export everything
    if (user.role === 'admin') return true;

    // Role-based permissions
    const permissions = {
      operator: ['events', 'access_logs', 'alerts', 'devices'],
      security: ['access_logs', 'alerts'],
      viewer: ['events', 'devices']
    };

    return permissions[user.role]?.includes(dataType) || false;
  }

  /**
   * Send file response
   */
  async sendFileResponse(res, exportResult) {
    const { filepath, filename, mimeType } = exportResult;

    try {
      // Check if file exists
      await fs.access(filepath);

      // Set response headers
      res.set({
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Export-Record-Count': exportResult.recordCount,
        'X-Export-Format': exportResult.format,
        'X-Export-Data-Type': exportResult.dataType
      });

      // Stream file to response
      const fileStream = require('fs').createReadStream(filepath);
      fileStream.pipe(res);

      // Delete file after sending
      fileStream.on('end', async () => {
        try {
          await fs.unlink(filepath);
          console.log(`🧹 Cleaned up export file: ${filename}`);
        } catch (error) {
          console.error(`❌ Failed to delete export file: ${filename}`, error);
        }
      });

    } catch (error) {
      console.error('❌ Failed to send file:', error);
      throw new Error('Export file not found');
    }
  }

  /**
   * Log export request for audit
   */
  logExportRequest(user, dataType, format, filters) {
    console.log(`📊 Export Audit Log:`, {
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      dataType,
      format,
      filters,
      timestamp: new Date().toISOString(),
      ip: user.ipAddress || 'unknown'
    });

    // In production, save to audit log database
  }

  /**
   * Get MIME type for format
   */
  getMimeType(format) {
    const mimeTypes = {
      csv: 'text/csv',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pdf: 'application/pdf'
    };
    return mimeTypes[format] || 'application/octet-stream';
  }

  /**
   * Get format description
   */
  getFormatDescription(format) {
    const descriptions = {
      csv: 'Comma-separated values file, compatible with all spreadsheet applications',
      xlsx: 'Microsoft Excel format with formatting and multiple sheets',
      pdf: 'Portable document format, ideal for printing and archiving'
    };
    return descriptions[format] || '';
  }

  /**
   * Get data type label
   */
  getDataTypeLabel(dataType) {
    const labels = {
      events: 'System Events',
      access_logs: 'Access Logs',
      alerts: 'Security Alerts',
      devices: 'Device Status',
      users: 'User List'
    };
    return labels[dataType] || dataType;
  }

  /**
   * Get data type description
   */
  getDataTypeDescription(dataType) {
    const descriptions = {
      events: 'All system events including logins, configuration changes, and system activities',
      access_logs: 'Building access records including granted and denied access attempts',
      alerts: 'Security alerts and notifications from all monitoring systems',
      devices: 'Current status and information of all connected devices',
      users: 'Complete list of system users with roles and status'
    };
    return descriptions[dataType] || '';
  }

  /**
   * Get available filters for data type
   */
  getAvailableFilters(dataType) {
    const baseFilters = ['dateRange', 'building'];
    
    const typeSpecificFilters = {
      events: [...baseFilters, 'eventType'],
      access_logs: [...baseFilters, 'accessStatus'],
      alerts: [...baseFilters, 'severity', 'status'],
      devices: ['building', 'deviceType', 'status'],
      users: ['role', 'status']
    };

    return typeSpecificFilters[dataType] || baseFilters;
  }

  /**
   * Get available buildings based on user permissions
   */
  async getAvailableBuildings(user) {
    // Mock building data - in production, fetch from database based on user permissions
    if (user.role === 'admin') {
      return [
        { value: 'all', label: 'All Buildings' },
        { value: 'building-1', label: 'Building A' },
        { value: 'building-2', label: 'Building B' },
        { value: 'building-3', label: 'Building C' }
      ];
    }

    // Return only buildings user has access to
    const userBuildings = user.buildings || [];
    return userBuildings.map(buildingId => ({
      value: buildingId,
      label: `Building ${buildingId.split('-')[1]?.toUpperCase() || buildingId}`
    }));
  }

  /**
   * Get event types
   */
  getEventTypes() {
    return [
      { value: 'all', label: 'All Event Types' },
      { value: 'system_start', label: 'System Start' },
      { value: 'system_stop', label: 'System Stop' },
      { value: 'config_change', label: 'Configuration Change' },
      { value: 'user_login', label: 'User Login' },
      { value: 'user_logout', label: 'User Logout' },
      { value: 'security_alert', label: 'Security Alert' },
      { value: 'device_status', label: 'Device Status Change' }
    ];
  }

  /**
   * Get total count for data type with filters
   */
  async getTotalCount(dataType, filters) {
    // Mock count - in production, query database with filters
    const baseCounts = {
      events: 15432,
      access_logs: 8765,
      alerts: 1234,
      devices: 156,
      users: 523
    };

    // Simulate filtering effect on count
    let count = baseCounts[dataType] || 0;
    
    if (filters.startDate || filters.endDate) {
      count = Math.floor(count * 0.3); // Assume date filter reduces to 30%
    }
    
    if (filters.buildingId) {
      count = Math.floor(count * 0.25); // Assume building filter reduces to 25%
    }

    return count;
  }
}

module.exports = new ExportController();