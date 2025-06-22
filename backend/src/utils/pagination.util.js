/**
 * Cursor-Based Pagination Utility
 * Efficient pagination for large datasets using encrypted cursors
 */

const crypto = require('crypto');
const { Op } = require('sequelize');
const { logger } = require('../config/logger');

// Pagination configuration
const PAGINATION_CONFIG = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
  ENCRYPTION_KEY: process.env.CURSOR_ENCRYPTION_KEY || 'default-cursor-key-change-in-production',
  ENCRYPTION_ALGORITHM: 'aes-256-gcm',
  CURSOR_SEPARATOR: '::',
  CURSOR_VERSION: '1.0'
};

class CursorPagination {
  /**
   * Encrypt cursor data
   */
  static encryptCursor(data) {
    try {
      const jsonData = JSON.stringify({
        v: PAGINATION_CONFIG.CURSOR_VERSION,
        ...data,
        t: Date.now() // Timestamp for validation
      });

      // Create cipher
      const key = crypto.scryptSync(PAGINATION_CONFIG.ENCRYPTION_KEY, 'salt', 32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(PAGINATION_CONFIG.ENCRYPTION_ALGORITHM, key, iv);

      // Encrypt data
      let encrypted = cipher.update(jsonData, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      // Get auth tag
      const authTag = cipher.getAuthTag();

      // Combine iv, authTag, and encrypted data
      const combined = Buffer.concat([
        iv,
        authTag,
        Buffer.from(encrypted, 'base64')
      ]);

      // Return base64 encoded cursor
      return combined.toString('base64url');
    } catch (error) {
      logger.error('Cursor encryption error:', {
        error: error.message
      });
      throw new Error('Failed to encrypt cursor');
    }
  }

  /**
   * Decrypt cursor data
   */
  static decryptCursor(cursor) {
    try {
      // Decode from base64url
      const combined = Buffer.from(cursor, 'base64url');

      // Extract components
      const iv = combined.slice(0, 16);
      const authTag = combined.slice(16, 32);
      const encrypted = combined.slice(32);

      // Create decipher
      const key = crypto.scryptSync(PAGINATION_CONFIG.ENCRYPTION_KEY, 'salt', 32);
      const decipher = crypto.createDecipheriv(PAGINATION_CONFIG.ENCRYPTION_ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      // Decrypt data
      let decrypted = decipher.update(encrypted, null, 'utf8');
      decrypted += decipher.final('utf8');

      // Parse JSON
      const data = JSON.parse(decrypted);

      // Validate version
      if (data.v !== PAGINATION_CONFIG.CURSOR_VERSION) {
        throw new Error('Invalid cursor version');
      }

      // Validate timestamp (cursor expires after 24 hours)
      const cursorAge = Date.now() - data.t;
      if (cursorAge > 24 * 60 * 60 * 1000) {
        throw new Error('Cursor expired');
      }

      return data;
    } catch (error) {
      logger.error('Cursor decryption error:', {
        error: error.message
      });
      throw new Error('Invalid cursor');
    }
  }

  /**
   * Create cursor from record
   */
  static createCursor(record, fields = ['id', 'created_at']) {
    const cursorData = {};
    
    fields.forEach(field => {
      if (record[field] !== undefined) {
        cursorData[field] = record[field];
      }
    });

    return this.encryptCursor(cursorData);
  }

  /**
   * Parse and validate pagination parameters
   */
  static parseParams(params = {}) {
    let { limit, cursor, direction = 'next' } = params;

    // Validate and sanitize limit
    limit = parseInt(limit) || PAGINATION_CONFIG.DEFAULT_LIMIT;
    limit = Math.max(PAGINATION_CONFIG.MIN_LIMIT, limit);
    limit = Math.min(PAGINATION_CONFIG.MAX_LIMIT, limit);

    // Validate direction
    if (!['next', 'prev'].includes(direction)) {
      direction = 'next';
    }

    // Decrypt cursor if provided
    let cursorData = null;
    if (cursor) {
      try {
        cursorData = this.decryptCursor(cursor);
      } catch (error) {
        throw new Error('Invalid pagination cursor');
      }
    }

    return { limit, cursor, cursorData, direction };
  }

  /**
   * Build WHERE clause for cursor-based pagination
   */
  static buildWhereClause(baseWhere = {}, cursorData, direction = 'next', orderField = 'created_at') {
    if (!cursorData) {
      return baseWhere;
    }

    const where = { ...baseWhere };
    
    // Build cursor conditions based on direction
    if (direction === 'next') {
      // For next page: records after cursor
      if (cursorData[orderField] && cursorData.id) {
        where[Op.or] = [
          {
            [orderField]: {
              [Op.gt]: cursorData[orderField]
            }
          },
          {
            [Op.and]: [
              { [orderField]: cursorData[orderField] },
              { id: { [Op.gt]: cursorData.id } }
            ]
          }
        ];
      }
    } else {
      // For previous page: records before cursor
      if (cursorData[orderField] && cursorData.id) {
        where[Op.or] = [
          {
            [orderField]: {
              [Op.lt]: cursorData[orderField]
            }
          },
          {
            [Op.and]: [
              { [orderField]: cursorData[orderField] },
              { id: { [Op.lt]: cursorData.id } }
            ]
          }
        ];
      }
    }

    return where;
  }

  /**
   * Paginate query results
   */
  static async paginate(model, options = {}) {
    const {
      where = {},
      include = [],
      attributes,
      order = [['created_at', 'DESC'], ['id', 'DESC']],
      limit: requestedLimit,
      cursor,
      direction = 'next',
      countTotal = false,
      raw = false,
      nest = true,
      mapResults,
      cursorFields = ['id', 'created_at']
    } = options;

    try {
      // Parse pagination parameters
      const { limit, cursorData } = this.parseParams({
        limit: requestedLimit,
        cursor,
        direction
      });

      // Build where clause with cursor
      const paginatedWhere = this.buildWhereClause(where, cursorData, direction, order[0][0]);

      // Adjust order for previous page
      let queryOrder = [...order];
      if (direction === 'prev') {
        queryOrder = queryOrder.map(([field, dir]) => [
          field,
          dir === 'DESC' ? 'ASC' : 'DESC'
        ]);
      }

      // Execute query with limit + 1 to check if there are more records
      const queryOptions = {
        where: paginatedWhere,
        include,
        attributes,
        order: queryOrder,
        limit: limit + 1,
        raw,
        nest
      };

      const results = await model.findAll(queryOptions);

      // Check if there are more records
      const hasMore = results.length > limit;
      const records = hasMore ? results.slice(0, limit) : results;

      // Reverse results for previous page
      if (direction === 'prev') {
        records.reverse();
      }

      // Map results if mapper provided
      const mappedRecords = mapResults ? records.map(mapResults) : records;

      // Create cursors
      let nextCursor = null;
      let prevCursor = null;

      if (mappedRecords.length > 0) {
        const firstRecord = records[0];
        const lastRecord = records[records.length - 1];

        if (direction === 'next') {
          prevCursor = cursor || null;
          nextCursor = hasMore ? this.createCursor(lastRecord, cursorFields) : null;
        } else {
          nextCursor = cursor || null;
          prevCursor = hasMore ? this.createCursor(firstRecord, cursorFields) : null;
        }
      }

      // Build metadata
      const metadata = {
        limit,
        count: mappedRecords.length,
        hasNextPage: !!nextCursor,
        hasPrevPage: !!prevCursor,
        nextCursor,
        prevCursor
      };

      // Optionally get total count
      if (countTotal) {
        metadata.total = await model.count({ where });
      }

      return {
        data: mappedRecords,
        metadata
      };

    } catch (error) {
      logger.error('Pagination error:', {
        error: error.message,
        model: model.name
      });
      throw error;
    }
  }

  /**
   * Paginate raw SQL query results
   */
  static async paginateRaw(sequelize, query, options = {}) {
    const {
      replacements = {},
      limit: requestedLimit,
      cursor,
      direction = 'next',
      orderField = 'created_at',
      idField = 'id',
      cursorFields = [idField, orderField],
      mapResults
    } = options;

    try {
      // Parse pagination parameters
      const { limit, cursorData } = this.parseParams({
        limit: requestedLimit,
        cursor,
        direction
      });

      // Build cursor conditions
      let cursorCondition = '';
      const cursorReplacements = {};

      if (cursorData) {
        if (direction === 'next') {
          cursorCondition = `AND (
            ${orderField} > :cursorDate OR 
            (${orderField} = :cursorDate AND ${idField} > :cursorId)
          )`;
        } else {
          cursorCondition = `AND (
            ${orderField} < :cursorDate OR 
            (${orderField} = :cursorDate AND ${idField} < :cursorId)
          )`;
        }
        cursorReplacements.cursorDate = cursorData[orderField];
        cursorReplacements.cursorId = cursorData[idField];
      }

      // Modify query with cursor and limit
      const orderDirection = direction === 'next' ? 'DESC' : 'ASC';
      const paginatedQuery = `
        WITH paginated_results AS (
          ${query}
          ${cursorCondition}
          ORDER BY ${orderField} ${orderDirection}, ${idField} ${orderDirection}
          LIMIT :limit
        )
        SELECT * FROM paginated_results
      `;

      // Execute query
      const results = await sequelize.query(paginatedQuery, {
        replacements: {
          ...replacements,
          ...cursorReplacements,
          limit: limit + 1
        },
        type: sequelize.QueryTypes.SELECT
      });

      // Check if there are more records
      const hasMore = results.length > limit;
      const records = hasMore ? results.slice(0, limit) : results;

      // Reverse results for previous page
      if (direction === 'prev') {
        records.reverse();
      }

      // Map results if mapper provided
      const mappedRecords = mapResults ? records.map(mapResults) : records;

      // Create cursors
      let nextCursor = null;
      let prevCursor = null;

      if (mappedRecords.length > 0) {
        const firstRecord = records[0];
        const lastRecord = records[records.length - 1];

        if (direction === 'next') {
          prevCursor = cursor || null;
          nextCursor = hasMore ? this.createCursor(lastRecord, cursorFields) : null;
        } else {
          nextCursor = cursor || null;
          prevCursor = hasMore ? this.createCursor(firstRecord, cursorFields) : null;
        }
      }

      return {
        data: mappedRecords,
        metadata: {
          limit,
          count: mappedRecords.length,
          hasNextPage: !!nextCursor,
          hasPrevPage: !!prevCursor,
          nextCursor,
          prevCursor
        }
      };

    } catch (error) {
      logger.error('Raw pagination error:', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Create keyset pagination helper for specific model
   */
  static createPaginator(model, defaultOptions = {}) {
    return {
      paginate: (options = {}) => {
        return this.paginate(model, { ...defaultOptions, ...options });
      },
      
      findPage: async (where = {}, options = {}) => {
        return this.paginate(model, { ...defaultOptions, ...options, where });
      },

      findNextPage: async (cursor, where = {}, options = {}) => {
        return this.paginate(model, {
          ...defaultOptions,
          ...options,
          where,
          cursor,
          direction: 'next'
        });
      },

      findPrevPage: async (cursor, where = {}, options = {}) => {
        return this.paginate(model, {
          ...defaultOptions,
          ...options,
          where,
          cursor,
          direction: 'prev'
        });
      }
    };
  }

  /**
   * Generate example URLs for pagination
   */
  static generatePaginationUrls(baseUrl, metadata) {
    const urls = {
      current: baseUrl
    };

    if (metadata.nextCursor) {
      urls.next = `${baseUrl}?cursor=${encodeURIComponent(metadata.nextCursor)}&limit=${metadata.limit}`;
    }

    if (metadata.prevCursor) {
      urls.prev = `${baseUrl}?cursor=${encodeURIComponent(metadata.prevCursor)}&limit=${metadata.limit}&direction=prev`;
    }

    return urls;
  }

  /**
   * Validate cursor without decrypting (for quick checks)
   */
  static isValidCursorFormat(cursor) {
    if (!cursor || typeof cursor !== 'string') {
      return false;
    }

    try {
      // Check if it's valid base64url
      const decoded = Buffer.from(cursor, 'base64url');
      // Minimum length check (iv + authTag + some data)
      return decoded.length > 32;
    } catch {
      return false;
    }
  }
}

// Export utilities
module.exports = {
  CursorPagination,
  paginate: CursorPagination.paginate.bind(CursorPagination),
  paginateRaw: CursorPagination.paginateRaw.bind(CursorPagination),
  createPaginator: CursorPagination.createPaginator.bind(CursorPagination),
  parseParams: CursorPagination.parseParams.bind(CursorPagination),
  PAGINATION_CONFIG
};