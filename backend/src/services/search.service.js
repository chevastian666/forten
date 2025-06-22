/**
 * Search Service
 * Full-text search implementation for PostgreSQL with GIN indexes
 * Supports events and logs search with ranking and highlighting
 */

const { Sequelize, Op } = require('sequelize');
const { logger } = require('../config/logger');
const { EventEmitter } = require('events');

class SearchService extends EventEmitter {
  constructor() {
    super();
    this.sequelize = null;
    this.models = null;
    this.isInitialized = false;
    
    // Search configuration
    this.config = {
      maxResults: 100,
      defaultLimit: 20,
      minQueryLength: 2,
      maxQueryLength: 500,
      highlightOptions: {
        maxWords: 35,
        minWords: 15,
        startSel: '<mark>',
        stopSel: '</mark>'
      },
      searchTypes: ['events', 'audit_logs', 'combined'],
      rankingWeights: {
        title: 1.0,
        description: 0.8,
        content: 0.6,
        metadata: 0.4
      }
    };

    // Search filters and sorting options
    this.filterOptions = {
      events: ['event_type', 'priority', 'location', 'created_at'],
      audit_logs: ['action', 'resource', 'user_id', 'ip_address', 'created_at']
    };

    this.sortOptions = {
      relevance: 'rank DESC',
      date_desc: 'created_at DESC',
      date_asc: 'created_at ASC',
      title_asc: 'title ASC',
      title_desc: 'title DESC'
    };
  }

  /**
   * Initialize search service
   */
  async initialize(sequelize, models) {
    try {
      this.sequelize = sequelize;
      this.models = models;

      // Test search functionality
      await this.testSearchCapabilities();

      this.isInitialized = true;

      logger.info('Search service initialized', {
        searchTypes: this.config.searchTypes,
        maxResults: this.config.maxResults
      });

      return true;
    } catch (error) {
      logger.error('Failed to initialize search service', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Test search capabilities
   */
  async testSearchCapabilities() {
    try {
      // Test if search functions exist
      const [results] = await this.sequelize.query(`
        SELECT 
          to_tsvector('forten_search', 'test search functionality') as test_vector,
          plainto_tsquery('forten_search', 'test') as test_query;
      `);

      if (!results || results.length === 0) {
        throw new Error('Search functions not available');
      }

      logger.debug('Search capabilities verified');
    } catch (error) {
      logger.error('Search capabilities test failed', {
        error: error.message
      });
      throw new Error('Search system not properly configured. Run migrations first.');
    }
  }

  /**
   * Perform full-text search
   */
  async search(query, options = {}) {
    const startTime = Date.now();
    
    try {
      // Validate and sanitize query
      const sanitizedQuery = this.sanitizeQuery(query);
      if (!sanitizedQuery) {
        throw new Error('Invalid search query');
      }

      // Parse options
      const searchOptions = this.parseSearchOptions(options);

      // Perform search based on type
      let results;
      switch (searchOptions.type) {
        case 'events':
          results = await this.searchEvents(sanitizedQuery, searchOptions);
          break;
        case 'audit_logs':
          results = await this.searchAuditLogs(sanitizedQuery, searchOptions);
          break;
        case 'combined':
          results = await this.searchCombined(sanitizedQuery, searchOptions);
          break;
        default:
          throw new Error(`Invalid search type: ${searchOptions.type}`);
      }

      const executionTime = Date.now() - startTime;

      // Log search statistics
      await this.logSearchStatistics(sanitizedQuery, searchOptions.type, results.length, executionTime, options.userId, options.ip);

      // Add metadata to results
      const searchResults = {
        query: sanitizedQuery,
        type: searchOptions.type,
        results: results,
        totalResults: results.length,
        executionTime,
        options: searchOptions,
        timestamp: new Date().toISOString()
      };

      logger.debug('Search completed', {
        query: sanitizedQuery,
        type: searchOptions.type,
        resultCount: results.length,
        executionTime
      });

      this.emit('searchCompleted', searchResults);

      return searchResults;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      logger.error('Search failed', {
        query,
        error: error.message,
        executionTime
      });

      this.emit('searchFailed', { query, error, executionTime });
      throw error;
    }
  }

  /**
   * Search events table
   */
  async searchEvents(query, options) {
    try {
      const baseQuery = `
        SELECT 
          e.*,
          search_rank(e.search_vector, $1, 1.0) as rank,
          search_highlight(
            COALESCE(e.title || ' ' || e.description, e.title, e.description, ''), 
            $1, 
            ${this.config.highlightOptions.maxWords}, 
            ${this.config.highlightOptions.minWords}
          ) as highlight
        FROM events e
        WHERE e.search_vector @@ plainto_tsquery('forten_search', $1)
      `;

      let whereConditions = [];
      let queryParams = [query];
      let paramCount = 1;

      // Add filters
      if (options.filters) {
        for (const [field, value] of Object.entries(options.filters)) {
          if (this.filterOptions.events.includes(field)) {
            paramCount++;
            if (field === 'created_at' && typeof value === 'object') {
              if (value.from) {
                whereConditions.push(`e.created_at >= $${paramCount}`);
                queryParams.push(value.from);
                paramCount++;
              }
              if (value.to) {
                whereConditions.push(`e.created_at <= $${paramCount}`);
                queryParams.push(value.to);
              }
            } else {
              whereConditions.push(`e.${field} = $${paramCount}`);
              queryParams.push(value);
            }
          }
        }
      }

      let fullQuery = baseQuery;
      if (whereConditions.length > 0) {
        fullQuery += ' AND ' + whereConditions.join(' AND ');
      }

      // Add sorting
      const sortBy = this.sortOptions[options.sort] || this.sortOptions.relevance;
      fullQuery += ` ORDER BY ${sortBy}`;

      // Add limit
      fullQuery += ` LIMIT ${options.limit}`;
      if (options.offset) {
        fullQuery += ` OFFSET ${options.offset}`;
      }

      const [results] = await this.sequelize.query(fullQuery, {
        bind: queryParams,
        type: Sequelize.QueryTypes.SELECT
      });

      return results.map(row => ({
        ...row,
        searchType: 'events',
        rank: parseFloat(row.rank) || 0
      }));

    } catch (error) {
      logger.error('Events search failed', {
        query,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Search audit logs table
   */
  async searchAuditLogs(query, options) {
    try {
      const baseQuery = `
        SELECT 
          al.*,
          search_rank(al.search_vector, $1, 1.0) as rank,
          search_highlight(
            COALESCE(al.action || ' ' || al.resource, al.action, al.resource, ''), 
            $1,
            ${this.config.highlightOptions.maxWords}, 
            ${this.config.highlightOptions.minWords}
          ) as highlight
        FROM audit_logs al
        WHERE al.search_vector @@ plainto_tsquery('forten_search', $1)
      `;

      let whereConditions = [];
      let queryParams = [query];
      let paramCount = 1;

      // Add filters
      if (options.filters) {
        for (const [field, value] of Object.entries(options.filters)) {
          if (this.filterOptions.audit_logs.includes(field)) {
            paramCount++;
            if (field === 'created_at' && typeof value === 'object') {
              if (value.from) {
                whereConditions.push(`al.created_at >= $${paramCount}`);
                queryParams.push(value.from);
                paramCount++;
              }
              if (value.to) {
                whereConditions.push(`al.created_at <= $${paramCount}`);
                queryParams.push(value.to);
              }
            } else {
              whereConditions.push(`al.${field} = $${paramCount}`);
              queryParams.push(value);
            }
          }
        }
      }

      let fullQuery = baseQuery;
      if (whereConditions.length > 0) {
        fullQuery += ' AND ' + whereConditions.join(' AND ');
      }

      // Add sorting
      const sortBy = this.sortOptions[options.sort] || this.sortOptions.relevance;
      fullQuery += ` ORDER BY ${sortBy}`;

      // Add limit
      fullQuery += ` LIMIT ${options.limit}`;
      if (options.offset) {
        fullQuery += ` OFFSET ${options.offset}`;
      }

      const [results] = await this.sequelize.query(fullQuery, {
        bind: queryParams,
        type: Sequelize.QueryTypes.SELECT
      });

      return results.map(row => ({
        ...row,
        searchType: 'audit_logs',
        rank: parseFloat(row.rank) || 0
      }));

    } catch (error) {
      logger.error('Audit logs search failed', {
        query,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Combined search across events and audit logs
   */
  async searchCombined(query, options) {
    try {
      // Search both tables in parallel
      const [eventsResults, auditLogsResults] = await Promise.all([
        this.searchEvents(query, { ...options, limit: Math.ceil(options.limit / 2) }),
        this.searchAuditLogs(query, { ...options, limit: Math.ceil(options.limit / 2) })
      ]);

      // Combine and sort by relevance
      const combined = [...eventsResults, ...auditLogsResults];
      
      // Sort by rank if relevance sorting
      if (options.sort === 'relevance' || !options.sort) {
        combined.sort((a, b) => (b.rank || 0) - (a.rank || 0));
      } else {
        // Sort by the specified field
        const sortField = options.sort.replace('_desc', '').replace('_asc', '');
        const isDesc = options.sort.includes('_desc');
        
        combined.sort((a, b) => {
          const aValue = a[sortField];
          const bValue = b[sortField];
          
          if (aValue < bValue) return isDesc ? 1 : -1;
          if (aValue > bValue) return isDesc ? -1 : 1;
          return 0;
        });
      }

      // Apply final limit
      return combined.slice(0, options.limit);

    } catch (error) {
      logger.error('Combined search failed', {
        query,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get search suggestions based on partial query
   */
  async getSuggestions(partialQuery, type = 'combined', limit = 10) {
    try {
      if (!partialQuery || partialQuery.length < 2) {
        return [];
      }

      const suggestions = new Set();

      // Get suggestions from recent searches
      const recentSearches = await this.getRecentSearches(type, limit * 2);
      for (const search of recentSearches) {
        if (search.query_text.toLowerCase().includes(partialQuery.toLowerCase())) {
          suggestions.add(search.query_text);
        }
      }

      // Add common terms suggestions
      const commonTerms = await this.getCommonSearchTerms(partialQuery, type, limit);
      for (const term of commonTerms) {
        suggestions.add(term);
      }

      return Array.from(suggestions).slice(0, limit);

    } catch (error) {
      logger.error('Failed to get search suggestions', {
        partialQuery,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Get recent searches
   */
  async getRecentSearches(type = 'combined', limit = 20) {
    try {
      const whereClause = type === 'combined' ? '' : 'WHERE search_type = $1';
      const params = type === 'combined' ? [] : [type];

      const query = `
        SELECT DISTINCT query_text, search_type, created_at
        FROM search_statistics 
        ${whereClause}
        ORDER BY created_at DESC 
        LIMIT $${params.length + 1}
      `;

      const [results] = await this.sequelize.query(query, {
        bind: [...params, limit],
        type: Sequelize.QueryTypes.SELECT
      });

      return results;

    } catch (error) {
      logger.error('Failed to get recent searches', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Get common search terms
   */
  async getCommonSearchTerms(prefix, type, limit) {
    try {
      // This would typically use a more sophisticated approach
      // For now, return some common terms based on prefix
      const commonTerms = [
        'access', 'door', 'user', 'login', 'security', 'alert', 'backup',
        'error', 'system', 'maintenance', 'event', 'log', 'audit'
      ];

      return commonTerms
        .filter(term => term.toLowerCase().startsWith(prefix.toLowerCase()))
        .slice(0, limit);

    } catch (error) {
      logger.error('Failed to get common search terms', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Get search analytics
   */
  async getSearchAnalytics(dateRange = {}) {
    try {
      const { from, to } = dateRange;
      let whereClause = '';
      let params = [];

      if (from || to) {
        const conditions = [];
        if (from) {
          conditions.push('created_at >= $1');
          params.push(from);
        }
        if (to) {
          conditions.push(`created_at <= $${params.length + 1}`);
          params.push(to);
        }
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }

      // Get top searches
      const topSearchesQuery = `
        SELECT 
          query_text,
          COUNT(*) as search_count,
          AVG(results_count) as avg_results,
          AVG(execution_time_ms) as avg_execution_time
        FROM search_statistics 
        ${whereClause}
        GROUP BY query_text 
        ORDER BY search_count DESC 
        LIMIT 20
      `;

      const [topSearches] = await this.sequelize.query(topSearchesQuery, {
        bind: params,
        type: Sequelize.QueryTypes.SELECT
      });

      // Get search trends by day
      const trendsQuery = `
        SELECT 
          DATE(created_at) as search_date,
          COUNT(*) as total_searches,
          COUNT(DISTINCT query_text) as unique_queries,
          AVG(execution_time_ms) as avg_execution_time
        FROM search_statistics 
        ${whereClause}
        GROUP BY DATE(created_at) 
        ORDER BY search_date DESC 
        LIMIT 30
      `;

      const [trends] = await this.sequelize.query(trendsQuery, {
        bind: params,
        type: Sequelize.QueryTypes.SELECT
      });

      // Get search type distribution
      const typeDistributionQuery = `
        SELECT 
          search_type,
          COUNT(*) as count,
          AVG(results_count) as avg_results
        FROM search_statistics 
        ${whereClause}
        GROUP BY search_type
      `;

      const [typeDistribution] = await this.sequelize.query(typeDistributionQuery, {
        bind: params,
        type: Sequelize.QueryTypes.SELECT
      });

      return {
        topSearches,
        trends,
        typeDistribution,
        dateRange: { from, to }
      };

    } catch (error) {
      logger.error('Failed to get search analytics', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Sanitize search query
   */
  sanitizeQuery(query) {
    if (!query || typeof query !== 'string') {
      return null;
    }

    // Trim and validate length
    query = query.trim();
    if (query.length < this.config.minQueryLength || query.length > this.config.maxQueryLength) {
      return null;
    }

    // Remove potentially dangerous characters
    query = query.replace(/[<>{}[\]\\\/\*\?\|\^]/g, ' ');
    
    // Normalize whitespace
    query = query.replace(/\s+/g, ' ').trim();

    return query;
  }

  /**
   * Parse search options
   */
  parseSearchOptions(options) {
    return {
      type: options.type && this.config.searchTypes.includes(options.type) ? options.type : 'combined',
      limit: Math.min(parseInt(options.limit) || this.config.defaultLimit, this.config.maxResults),
      offset: Math.max(parseInt(options.offset) || 0, 0),
      sort: options.sort && this.sortOptions[options.sort] ? options.sort : 'relevance',
      filters: options.filters || {},
      highlight: options.highlight !== false
    };
  }

  /**
   * Log search statistics
   */
  async logSearchStatistics(query, type, resultCount, executionTime, userId = null, ipAddress = null) {
    try {
      await this.sequelize.query(`
        INSERT INTO search_statistics 
        (query_text, search_type, results_count, execution_time_ms, user_id, ip_address, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, {
        bind: [query, type, resultCount, executionTime, userId, ipAddress],
        type: Sequelize.QueryTypes.INSERT
      });

    } catch (error) {
      logger.warn('Failed to log search statistics', {
        error: error.message
      });
      // Don't throw error as this is not critical
    }
  }

  /**
   * Rebuild search indexes
   */
  async rebuildSearchIndexes() {
    try {
      logger.info('Starting search index rebuild');

      // Update events search vectors
      await this.sequelize.query(`
        UPDATE events SET search_vector = 
          setweight(to_tsvector('forten_search', COALESCE(title, '')), 'A') ||
          setweight(to_tsvector('forten_search', COALESCE(description, '')), 'B') ||
          setweight(to_tsvector('forten_search', COALESCE(event_type, '')), 'C') ||
          setweight(to_tsvector('forten_search', COALESCE(location, '')), 'D') ||
          setweight(to_tsvector('forten_search', COALESCE(metadata::text, '')), 'D');
      `);

      // Update audit logs search vectors
      await this.sequelize.query(`
        UPDATE audit_logs SET search_vector = 
          setweight(to_tsvector('forten_search', COALESCE(action, '')), 'A') ||
          setweight(to_tsvector('forten_search', COALESCE(resource, '')), 'B') ||
          setweight(to_tsvector('forten_search', COALESCE(user_id::text, '')), 'C') ||
          setweight(to_tsvector('forten_search', COALESCE(ip_address, '')), 'C') ||
          setweight(to_tsvector('forten_search', COALESCE(user_agent, '')), 'D') ||
          setweight(to_tsvector('forten_search', COALESCE(changes::text, '')), 'D');
      `);

      logger.info('Search index rebuild completed');
      
      this.emit('indexesRebuilt');
      
      return { success: true, message: 'Search indexes rebuilt successfully' };

    } catch (error) {
      logger.error('Search index rebuild failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get search service status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      config: this.config,
      filterOptions: this.filterOptions,
      sortOptions: Object.keys(this.sortOptions)
    };
  }

  /**
   * Shutdown search service
   */
  async shutdown() {
    this.sequelize = null;
    this.models = null;
    this.isInitialized = false;
    
    logger.info('Search service shut down');
  }
}

// Export singleton
module.exports = new SearchService();