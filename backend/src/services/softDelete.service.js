/**
 * Soft Delete Service
 * Utility service for managing soft deleted records across all models
 */

const { Op } = require('sequelize');
const { logger } = require('../config/logger');

class SoftDeleteService {
  constructor() {
    this.models = null;
    this.isInitialized = false;
  }

  /**
   * Initialize service with models
   */
  initialize(models) {
    this.models = models;
    this.isInitialized = true;
    logger.info('Soft delete service initialized');
  }

  /**
   * Get all soft deleted records across all models
   */
  async getAllDeletedRecords(options = {}) {
    const { model, limit = 100, offset = 0 } = options;
    
    if (!this.isInitialized) {
      throw new Error('Soft delete service not initialized');
    }

    const results = {};

    // Get list of models to check
    const modelsToCheck = model ? [model] : Object.keys(this.models);

    for (const modelName of modelsToCheck) {
      const Model = this.models[modelName];
      
      // Skip if model doesn't support paranoid
      if (!Model || !Model.options || !Model.options.paranoid) {
        continue;
      }

      try {
        const deletedRecords = await Model.findAndCountAll({
          where: {
            deleted_at: {
              [Op.ne]: null
            }
          },
          paranoid: false,
          limit,
          offset,
          order: [['deleted_at', 'DESC']],
          attributes: {
            include: ['deleted_at']
          }
        });

        results[modelName] = {
          count: deletedRecords.count,
          rows: deletedRecords.rows
        };
      } catch (error) {
        logger.error(`Error fetching deleted records for ${modelName}`, {
          error: error.message
        });
        results[modelName] = {
          count: 0,
          rows: [],
          error: error.message
        };
      }
    }

    return results;
  }

  /**
   * Restore a record by model and ID
   */
  async restoreRecord(modelName, id) {
    if (!this.isInitialized) {
      throw new Error('Soft delete service not initialized');
    }

    const Model = this.models[modelName];
    if (!Model) {
      throw new Error(`Model ${modelName} not found`);
    }

    if (!Model.options || !Model.options.paranoid) {
      throw new Error(`Model ${modelName} does not support soft deletes`);
    }

    try {
      const record = await Model.findByPk(id, { paranoid: false });
      
      if (!record) {
        throw new Error(`Record with ID ${id} not found in ${modelName}`);
      }

      if (!record.deleted_at) {
        throw new Error(`Record with ID ${id} is not deleted`);
      }

      await record.restore();
      
      logger.info('Record restored', {
        model: modelName,
        id,
        restoredAt: new Date()
      });

      return record;
    } catch (error) {
      logger.error('Error restoring record', {
        model: modelName,
        id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Permanently delete (hard delete) a soft deleted record
   */
  async permanentlyDelete(modelName, id) {
    if (!this.isInitialized) {
      throw new Error('Soft delete service not initialized');
    }

    const Model = this.models[modelName];
    if (!Model) {
      throw new Error(`Model ${modelName} not found`);
    }

    try {
      const record = await Model.findByPk(id, { paranoid: false });
      
      if (!record) {
        throw new Error(`Record with ID ${id} not found in ${modelName}`);
      }

      if (!record.deleted_at) {
        throw new Error(`Record with ID ${id} is not soft deleted`);
      }

      await record.destroy({ force: true });
      
      logger.warn('Record permanently deleted', {
        model: modelName,
        id,
        deletedAt: new Date()
      });

      return true;
    } catch (error) {
      logger.error('Error permanently deleting record', {
        model: modelName,
        id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Bulk restore records by model and IDs
   */
  async bulkRestore(modelName, ids) {
    if (!this.isInitialized) {
      throw new Error('Soft delete service not initialized');
    }

    const Model = this.models[modelName];
    if (!Model) {
      throw new Error(`Model ${modelName} not found`);
    }

    if (!Model.options || !Model.options.paranoid) {
      throw new Error(`Model ${modelName} does not support soft deletes`);
    }

    try {
      const records = await Model.findAll({
        where: {
          id: {
            [Op.in]: ids
          },
          deleted_at: {
            [Op.ne]: null
          }
        },
        paranoid: false
      });

      const restored = [];
      const errors = [];

      for (const record of records) {
        try {
          await record.restore();
          restored.push(record.id);
        } catch (error) {
          errors.push({
            id: record.id,
            error: error.message
          });
        }
      }

      logger.info('Bulk restore completed', {
        model: modelName,
        requested: ids.length,
        restored: restored.length,
        errors: errors.length
      });

      return {
        restored,
        errors,
        summary: {
          requested: ids.length,
          restored: restored.length,
          failed: errors.length
        }
      };
    } catch (error) {
      logger.error('Error in bulk restore', {
        model: modelName,
        ids,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Clean up old soft deleted records
   */
  async cleanupOldDeleted(daysOld = 30, modelName = null) {
    if (!this.isInitialized) {
      throw new Error('Soft delete service not initialized');
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const results = {};
    const modelsToClean = modelName ? [modelName] : Object.keys(this.models);

    for (const model of modelsToClean) {
      const Model = this.models[model];
      
      // Skip if model doesn't support paranoid
      if (!Model || !Model.options || !Model.options.paranoid) {
        continue;
      }

      try {
        const deletedCount = await Model.destroy({
          where: {
            deleted_at: {
              [Op.lt]: cutoffDate,
              [Op.ne]: null
            }
          },
          force: true,
          paranoid: false
        });

        results[model] = {
          cleaned: deletedCount,
          cutoffDate: cutoffDate.toISOString()
        };

        logger.info('Cleaned up old deleted records', {
          model,
          count: deletedCount,
          cutoffDate: cutoffDate.toISOString()
        });
      } catch (error) {
        logger.error(`Error cleaning up ${model}`, {
          error: error.message
        });
        results[model] = {
          cleaned: 0,
          error: error.message
        };
      }
    }

    return results;
  }

  /**
   * Get soft delete statistics
   */
  async getDeleteStatistics() {
    if (!this.isInitialized) {
      throw new Error('Soft delete service not initialized');
    }

    const stats = {
      models: {},
      summary: {
        totalDeleted: 0,
        oldestDeletion: null,
        newestDeletion: null
      }
    };

    for (const modelName of Object.keys(this.models)) {
      const Model = this.models[modelName];
      
      // Skip if model doesn't support paranoid
      if (!Model || !Model.options || !Model.options.paranoid) {
        continue;
      }

      try {
        // Count soft deleted records
        const deletedCount = await Model.count({
          where: {
            deleted_at: {
              [Op.ne]: null
            }
          },
          paranoid: false
        });

        // Get oldest and newest deletions
        let oldestDeletion = null;
        let newestDeletion = null;

        if (deletedCount > 0) {
          const oldest = await Model.findOne({
            where: {
              deleted_at: {
                [Op.ne]: null
              }
            },
            order: [['deleted_at', 'ASC']],
            paranoid: false,
            attributes: ['deleted_at']
          });

          const newest = await Model.findOne({
            where: {
              deleted_at: {
                [Op.ne]: null
              }
            },
            order: [['deleted_at', 'DESC']],
            paranoid: false,
            attributes: ['deleted_at']
          });

          oldestDeletion = oldest?.deleted_at;
          newestDeletion = newest?.deleted_at;
        }

        stats.models[modelName] = {
          deletedCount,
          oldestDeletion,
          newestDeletion
        };

        stats.summary.totalDeleted += deletedCount;

        // Update summary dates
        if (oldestDeletion && (!stats.summary.oldestDeletion || oldestDeletion < stats.summary.oldestDeletion)) {
          stats.summary.oldestDeletion = oldestDeletion;
        }

        if (newestDeletion && (!stats.summary.newestDeletion || newestDeletion > stats.summary.newestDeletion)) {
          stats.summary.newestDeletion = newestDeletion;
        }

      } catch (error) {
        logger.error(`Error getting stats for ${modelName}`, {
          error: error.message
        });
        stats.models[modelName] = {
          deletedCount: 0,
          error: error.message
        };
      }
    }

    return stats;
  }

  /**
   * Search deleted records across models
   */
  async searchDeletedRecords(searchTerm, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Soft delete service not initialized');
    }

    const { models: modelFilter, limit = 50 } = options;
    const results = {};
    
    const modelsToSearch = modelFilter || Object.keys(this.models);

    for (const modelName of modelsToSearch) {
      const Model = this.models[modelName];
      
      // Skip if model doesn't support paranoid
      if (!Model || !Model.options || !Model.options.paranoid) {
        continue;
      }

      try {
        // Get model attributes that are strings
        const stringAttributes = Object.keys(Model.rawAttributes)
          .filter(attr => {
            const attrType = Model.rawAttributes[attr].type;
            return attrType.constructor.name === 'STRING' || 
                   attrType.constructor.name === 'TEXT';
          });

        if (stringAttributes.length === 0) {
          continue;
        }

        // Build search conditions
        const searchConditions = stringAttributes.map(attr => ({
          [attr]: {
            [Op.iLike]: `%${searchTerm}%`
          }
        }));

        const records = await Model.findAll({
          where: {
            [Op.and]: [
              {
                deleted_at: {
                  [Op.ne]: null
                }
              },
              {
                [Op.or]: searchConditions
              }
            ]
          },
          paranoid: false,
          limit,
          order: [['deleted_at', 'DESC']]
        });

        results[modelName] = records;
      } catch (error) {
        logger.error(`Error searching in ${modelName}`, {
          error: error.message,
          searchTerm
        });
        results[modelName] = [];
      }
    }

    return results;
  }
}

// Export singleton
module.exports = new SoftDeleteService();