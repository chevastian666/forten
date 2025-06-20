/**
 * Bulk Operations Controller
 * Handles bulk create, update, and delete operations with transaction support
 * Maximum 1000 records per operation with comprehensive error handling
 */

const { Sequelize } = require('sequelize');
const { logger } = require('../config/logger');
const bulkValidator = require('../validators/bulk.validator');

class BulkController {
  constructor() {
    this.sequelize = null;
    this.models = null;
    this.isInitialized = false;
    
    // Operation statistics
    this.stats = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      totalRecordsProcessed: 0
    };

    // Configuration
    this.config = {
      maxBatchSize: 1000,
      defaultBatchSize: 50,
      transactionTimeout: 300000, // 5 minutes
      maxRetries: 3,
      retryDelay: 1000
    };
  }

  /**
   * Initialize bulk controller
   */
  async initialize(sequelize, models) {
    try {
      this.sequelize = sequelize;
      this.models = models;
      this.isInitialized = true;

      logger.info('Bulk controller initialized', {
        maxBatchSize: this.config.maxBatchSize,
        supportedModels: Object.keys(models)
      });

      return true;
    } catch (error) {
      logger.error('Failed to initialize bulk controller', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Execute bulk operation
   */
  async executeBulkOperation(req, res) {
    const startTime = Date.now();
    const operationId = `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      if (!req.validated) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_REQUIRED',
            message: 'Request must be validated first'
          }
        });
      }

      const { operation, resource, data, options = {} } = req.body;
      const {
        transaction: useTransaction = true,
        dryRun = false,
        continueOnError = false,
        batchSize = this.config.defaultBatchSize
      } = options;

      logger.info('Starting bulk operation', {
        operationId,
        operation,
        resource,
        recordCount: data.length,
        options: { useTransaction, dryRun, continueOnError, batchSize },
        userId: req.user?.id,
        ip: req.ip
      });

      // Get model
      const model = this.getModel(resource);
      if (!model) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_RESOURCE',
            message: `Resource '${resource}' not found`
          }
        });
      }

      let results;
      
      if (dryRun) {
        // Perform dry run validation
        results = await this.performDryRun(operation, model, data);
      } else {
        // Execute actual operation
        if (useTransaction) {
          results = await this.executeWithTransaction(operation, model, data, {
            batchSize,
            continueOnError,
            operationId
          });
        } else {
          results = await this.executeWithoutTransaction(operation, model, data, {
            batchSize,
            continueOnError,
            operationId
          });
        }
      }

      const executionTime = Date.now() - startTime;
      
      // Update statistics
      this.updateStats(results, data.length);

      const response = {
        success: results.success,
        operationId,
        operation,
        resource,
        dryRun,
        summary: {
          totalRecords: data.length,
          successfulRecords: results.successful.length,
          failedRecords: results.failed.length,
          skippedRecords: results.skipped?.length || 0
        },
        results: {
          successful: results.successful,
          failed: results.failed,
          skipped: results.skipped || []
        },
        executionTime,
        timestamp: new Date().toISOString()
      };

      // Log operation completion
      logger.info('Bulk operation completed', {
        operationId,
        success: results.success,
        summary: response.summary,
        executionTime
      });

      res.status(200).json(response);

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      logger.error('Bulk operation failed', {
        operationId,
        error: error.message,
        stack: error.stack,
        executionTime
      });

      this.stats.failedOperations++;

      res.status(500).json({
        success: false,
        operationId,
        error: {
          code: 'BULK_OPERATION_ERROR',
          message: 'Bulk operation failed',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        executionTime,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Execute operation with transaction
   */
  async executeWithTransaction(operation, model, data, options) {
    const transaction = await this.sequelize.transaction({
      timeout: this.config.transactionTimeout
    });

    try {
      const results = await this.executeOperation(operation, model, data, {
        ...options,
        transaction
      });

      if (results.success || options.continueOnError) {
        await transaction.commit();
        logger.info('Transaction committed', {
          operationId: options.operationId,
          recordsProcessed: data.length
        });
      } else {
        await transaction.rollback();
        logger.warn('Transaction rolled back due to errors', {
          operationId: options.operationId,
          failedRecords: results.failed.length
        });
      }

      return results;

    } catch (error) {
      await transaction.rollback();
      logger.error('Transaction rolled back due to exception', {
        operationId: options.operationId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Execute operation without transaction
   */
  async executeWithoutTransaction(operation, model, data, options) {
    return await this.executeOperation(operation, model, data, options);
  }

  /**
   * Execute the actual operation
   */
  async executeOperation(operation, model, data, options = {}) {
    const { batchSize, continueOnError, transaction, operationId } = options;
    
    const results = {
      successful: [],
      failed: [],
      success: true
    };

    // Process data in batches
    const batches = this.createBatches(data, batchSize);
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      logger.debug('Processing batch', {
        operationId,
        batchIndex: batchIndex + 1,
        totalBatches: batches.length,
        batchSize: batch.length
      });

      try {
        const batchResults = await this.processBatch(operation, model, batch, {
          transaction,
          batchIndex,
          operationId
        });

        results.successful.push(...batchResults.successful);
        results.failed.push(...batchResults.failed);

        // Check if we should continue on error
        if (batchResults.failed.length > 0 && !continueOnError) {
          results.success = false;
          break;
        }

      } catch (error) {
        logger.error('Batch processing failed', {
          operationId,
          batchIndex,
          error: error.message
        });

        // Mark all items in batch as failed
        batch.forEach((item, index) => {
          results.failed.push({
            index: batchIndex * batchSize + index,
            data: item,
            error: error.message
          });
        });

        if (!continueOnError) {
          results.success = false;
          break;
        }
      }
    }

    // Overall success determination
    results.success = results.success && results.failed.length === 0;

    return results;
  }

  /**
   * Process a single batch
   */
  async processBatch(operation, model, batch, options = {}) {
    const { transaction, batchIndex, operationId } = options;
    
    const results = {
      successful: [],
      failed: []
    };

    switch (operation) {
      case 'create':
        return await this.processBatchCreate(model, batch, { transaction, batchIndex, operationId });
      case 'update':
        return await this.processBatchUpdate(model, batch, { transaction, batchIndex, operationId });
      case 'delete':
        return await this.processBatchDelete(model, batch, { transaction, batchIndex, operationId });
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }

  /**
   * Process batch create operation
   */
  async processBatchCreate(model, batch, options = {}) {
    const { transaction } = options;
    const results = { successful: [], failed: [] };

    try {
      // Use bulk create for better performance
      const created = await model.bulkCreate(batch, {
        transaction,
        validate: true,
        returning: true,
        ignoreDuplicates: false
      });

      created.forEach((record, index) => {
        results.successful.push({
          index,
          id: record.id,
          data: record.dataValues
        });
      });

    } catch (error) {
      // If bulk create fails, try individual creates to identify specific errors
      if (error.name === 'SequelizeBulkRecordError' || error.name === 'SequelizeValidationError') {
        for (let i = 0; i < batch.length; i++) {
          try {
            const record = await model.create(batch[i], { transaction });
            results.successful.push({
              index: i,
              id: record.id,
              data: record.dataValues
            });
          } catch (itemError) {
            results.failed.push({
              index: i,
              data: batch[i],
              error: itemError.message
            });
          }
        }
      } else {
        // Bulk operation failed entirely
        batch.forEach((item, index) => {
          results.failed.push({
            index,
            data: item,
            error: error.message
          });
        });
      }
    }

    return results;
  }

  /**
   * Process batch update operation
   */
  async processBatchUpdate(model, batch, options = {}) {
    const { transaction } = options;
    const results = { successful: [], failed: [] };

    // Updates must be processed individually due to different IDs
    for (let i = 0; i < batch.length; i++) {
      const item = batch[i];
      const { id, ...updateData } = item;

      try {
        const [updatedRowsCount, updatedRows] = await model.update(updateData, {
          where: { id },
          transaction,
          returning: true
        });

        if (updatedRowsCount > 0) {
          results.successful.push({
            index: i,
            id,
            data: updatedRows[0]?.dataValues || updateData,
            updated: updatedRowsCount
          });
        } else {
          results.failed.push({
            index: i,
            data: item,
            error: 'Record not found or no changes made'
          });
        }

      } catch (error) {
        results.failed.push({
          index: i,
          data: item,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Process batch delete operation
   */
  async processBatchDelete(model, batch, options = {}) {
    const { transaction } = options;
    const results = { successful: [], failed: [] };

    try {
      // Extract IDs for bulk delete
      const ids = batch.map(item => item.id).filter(id => id);
      
      if (ids.length === 0) {
        batch.forEach((item, index) => {
          results.failed.push({
            index,
            data: item,
            error: 'ID is required for delete operation'
          });
        });
        return results;
      }

      // Perform bulk delete
      const deletedCount = await model.destroy({
        where: { id: ids },
        transaction
      });

      // If soft delete is enabled, get the updated records
      if (model.rawAttributes.deleted_at) {
        const deletedRecords = await model.findAll({
          where: { id: ids },
          paranoid: false,
          transaction
        });

        deletedRecords.forEach((record, index) => {
          results.successful.push({
            index,
            id: record.id,
            data: record.dataValues,
            deleted: true
          });
        });
      } else {
        // Hard delete - just return IDs
        ids.forEach((id, index) => {
          results.successful.push({
            index,
            id,
            deleted: true
          });
        });
      }

      // Check for IDs that weren't deleted
      if (deletedCount < ids.length) {
        const notDeletedIds = ids.slice(deletedCount);
        notDeletedIds.forEach((id, index) => {
          const originalIndex = batch.findIndex(item => item.id === id);
          results.failed.push({
            index: originalIndex,
            data: batch[originalIndex],
            error: 'Record not found or already deleted'
          });
        });
      }

    } catch (error) {
      batch.forEach((item, index) => {
        results.failed.push({
          index,
          data: item,
          error: error.message
        });
      });
    }

    return results;
  }

  /**
   * Perform dry run validation
   */
  async performDryRun(operation, model, data) {
    const results = {
      successful: [],
      failed: [],
      success: true
    };

    for (let i = 0; i < data.length; i++) {
      const item = data[i];

      try {
        switch (operation) {
          case 'create':
            await model.build(item).validate();
            results.successful.push({
              index: i,
              data: item,
              action: 'would_create'
            });
            break;

          case 'update':
            if (!item.id) {
              throw new Error('ID is required for update operation');
            }
            const existingRecord = await model.findByPk(item.id);
            if (!existingRecord) {
              throw new Error('Record not found');
            }
            const { id, ...updateData } = item;
            await model.build({ ...existingRecord.dataValues, ...updateData }).validate();
            results.successful.push({
              index: i,
              id: item.id,
              data: updateData,
              action: 'would_update'
            });
            break;

          case 'delete':
            if (!item.id) {
              throw new Error('ID is required for delete operation');
            }
            const recordToDelete = await model.findByPk(item.id);
            if (!recordToDelete) {
              throw new Error('Record not found');
            }
            results.successful.push({
              index: i,
              id: item.id,
              action: 'would_delete'
            });
            break;
        }

      } catch (error) {
        results.failed.push({
          index: i,
          data: item,
          error: error.message
        });
      }
    }

    results.success = results.failed.length === 0;
    return results;
  }

  /**
   * Get operation status
   */
  async getOperationStatus(req, res) {
    try {
      const { operationId } = req.params;
      
      // This would typically query a job queue or status table
      // For now, return a placeholder response
      
      res.json({
        success: true,
        operationId,
        status: 'completed', // pending, processing, completed, failed
        message: 'Operation status endpoint placeholder',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get operation status', {
        operationId: req.params.operationId,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'STATUS_CHECK_ERROR',
          message: 'Failed to retrieve operation status'
        }
      });
    }
  }

  /**
   * Get bulk operations statistics
   */
  async getStatistics(req, res) {
    try {
      const stats = {
        ...this.stats,
        successRate: this.stats.totalOperations > 0 
          ? (this.stats.successfulOperations / this.stats.totalOperations * 100).toFixed(2) 
          : 0,
        averageRecordsPerOperation: this.stats.totalOperations > 0 
          ? Math.round(this.stats.totalRecordsProcessed / this.stats.totalOperations) 
          : 0,
        configuration: this.config
      };

      res.json({
        success: true,
        statistics: stats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get bulk operations statistics', {
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'STATISTICS_ERROR',
          message: 'Failed to retrieve statistics'
        }
      });
    }
  }

  /**
   * Helper methods
   */
  getModel(resource) {
    const modelMap = {
      events: 'Event',
      audit_logs: 'AuditLog',
      pins: 'Pin',
      users: 'User',
      notifications: 'Notification'
    };

    const modelName = modelMap[resource];
    return this.models ? this.models[modelName] : null;
  }

  createBatches(data, batchSize) {
    const batches = [];
    for (let i = 0; i < data.length; i += batchSize) {
      batches.push(data.slice(i, i + batchSize));
    }
    return batches;
  }

  updateStats(results, totalRecords) {
    this.stats.totalOperations++;
    this.stats.totalRecordsProcessed += totalRecords;
    
    if (results.success) {
      this.stats.successfulOperations++;
    } else {
      this.stats.failedOperations++;
    }
  }

  /**
   * Get controller status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      config: this.config,
      statistics: this.stats
    };
  }
}

module.exports = new BulkController();