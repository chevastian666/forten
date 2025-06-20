import { Sequelize, QueryTypes } from 'sequelize';
import { Logger } from '../logging/Logger';
import { CacheService } from '../cache/CacheService';

export interface QueryPlan {
  query: string;
  plan: any[];
  executionTime: number;
  bufferHits: number;
  bufferMisses: number;
  cost: number;
  rows: number;
  warnings: string[];
  suggestions: string[];
}

export interface QueryStats {
  query: string;
  count: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  lastExecuted: Date;
}

export class QueryOptimizer {
  private readonly logger: Logger;
  private readonly queryStats: Map<string, QueryStats> = new Map();
  private readonly slowQueryThreshold = 1000; // 1 second
  
  constructor(
    private readonly sequelize: Sequelize,
    private readonly cache: CacheService
  ) {
    this.logger = new Logger('QueryOptimizer');
  }

  /**
   * Analyze query execution plan
   */
  async analyzeQuery(query: string, params?: any[]): Promise<QueryPlan> {
    const startTime = Date.now();
    
    try {
      // Get execution plan
      const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
      const [results] = await this.sequelize.query(explainQuery, {
        replacements: params,
        type: QueryTypes.SELECT,
        raw: true
      });

      const plan = results['QUERY PLAN'][0];
      const executionTime = Date.now() - startTime;

      // Extract metrics
      const metrics = this.extractMetrics(plan);
      
      // Generate warnings and suggestions
      const warnings = this.detectIssues(plan);
      const suggestions = this.generateSuggestions(plan, warnings);

      const queryPlan: QueryPlan = {
        query,
        plan: plan.Plan,
        executionTime,
        bufferHits: metrics.bufferHits,
        bufferMisses: metrics.bufferMisses,
        cost: metrics.totalCost,
        rows: metrics.rows,
        warnings,
        suggestions
      };

      // Cache the analysis
      await this.cache.query({
        key: `query-plan:${this.hashQuery(query)}`,
        query: async () => queryPlan,
        ttl: 3600,
        namespace: 'optimization'
      });

      return queryPlan;
    } catch (error) {
      this.logger.error('Query analysis failed', error, { query });
      throw error;
    }
  }

  /**
   * Track query performance
   */
  async trackQuery(query: string, executionTime: number): Promise<void> {
    const normalizedQuery = this.normalizeQuery(query);
    const stats = this.queryStats.get(normalizedQuery) || {
      query: normalizedQuery,
      count: 0,
      totalTime: 0,
      avgTime: 0,
      minTime: Infinity,
      maxTime: -Infinity,
      lastExecuted: new Date()
    };

    stats.count++;
    stats.totalTime += executionTime;
    stats.avgTime = stats.totalTime / stats.count;
    stats.minTime = Math.min(stats.minTime, executionTime);
    stats.maxTime = Math.max(stats.maxTime, executionTime);
    stats.lastExecuted = new Date();

    this.queryStats.set(normalizedQuery, stats);

    // Log slow queries
    if (executionTime > this.slowQueryThreshold) {
      this.logger.warn('Slow query detected', {
        query: normalizedQuery,
        executionTime,
        threshold: this.slowQueryThreshold
      });

      // Analyze slow query automatically
      await this.analyzeSlowQuery(query);
    }
  }

  /**
   * Get query statistics
   */
  getQueryStats(): QueryStats[] {
    return Array.from(this.queryStats.values())
      .sort((a, b) => b.totalTime - a.totalTime);
  }

  /**
   * Get slow queries
   */
  getSlowQueries(limit: number = 10): QueryStats[] {
    return this.getQueryStats()
      .filter(stats => stats.avgTime > this.slowQueryThreshold)
      .slice(0, limit);
  }

  /**
   * Optimize a specific query
   */
  async optimizeQuery(query: string): Promise<{
    original: QueryPlan;
    optimized: string;
    improvements: string[];
  }> {
    const original = await this.analyzeQuery(query);
    const optimized = this.generateOptimizedQuery(query, original);
    const improvements: string[] = [];

    // Test if optimized query is better
    if (optimized !== query) {
      const optimizedPlan = await this.analyzeQuery(optimized);
      
      if (optimizedPlan.cost < original.cost) {
        improvements.push(`Reduced query cost by ${((1 - optimizedPlan.cost / original.cost) * 100).toFixed(1)}%`);
      }
      
      if (optimizedPlan.executionTime < original.executionTime) {
        improvements.push(`Reduced execution time by ${((1 - optimizedPlan.executionTime / original.executionTime) * 100).toFixed(1)}%`);
      }
    }

    return {
      original,
      optimized,
      improvements
    };
  }

  /**
   * Create missing indexes based on query patterns
   */
  async suggestIndexes(): Promise<Array<{
    table: string;
    columns: string[];
    reason: string;
    estimatedImprovement: string;
  }>> {
    const suggestions: Array<{
      table: string;
      columns: string[];
      reason: string;
      estimatedImprovement: string;
    }> = [];

    // Analyze slow queries
    const slowQueries = this.getSlowQueries(20);
    
    for (const stats of slowQueries) {
      const plan = await this.analyzeQuery(stats.query);
      
      // Look for sequential scans
      const seqScans = this.findSequentialScans(plan.plan);
      
      for (const scan of seqScans) {
        if (scan.rows > 1000) {
          suggestions.push({
            table: scan.relation,
            columns: scan.filterColumns,
            reason: `Sequential scan on ${scan.relation} processing ${scan.rows} rows`,
            estimatedImprovement: `${((scan.cost / plan.cost) * 100).toFixed(1)}% query cost reduction`
          });
        }
      }
    }

    // Remove duplicates
    const unique = suggestions.filter((s, index, self) =>
      index === self.findIndex(t => 
        t.table === s.table && 
        JSON.stringify(t.columns) === JSON.stringify(s.columns)
      )
    );

    return unique;
  }

  /**
   * Vacuum and analyze tables
   */
  async optimizeTables(): Promise<void> {
    try {
      // Get all tables
      const tables = await this.sequelize.query(
        `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
        { type: QueryTypes.SELECT }
      );

      for (const { tablename } of tables) {
        // Vacuum analyze each table
        await this.sequelize.query(`VACUUM ANALYZE ${tablename}`);
        this.logger.info(`Optimized table: ${tablename}`);
      }

      // Update table statistics
      await this.sequelize.query('ANALYZE');
      
      this.logger.info('Database optimization completed');
    } catch (error) {
      this.logger.error('Table optimization failed', error);
    }
  }

  /**
   * Monitor query performance in real-time
   */
  async monitorPerformance(): Promise<{
    activeQueries: number;
    avgQueryTime: number;
    slowQueries: number;
    cacheHitRate: number;
    connections: {
      active: number;
      idle: number;
      total: number;
    };
  }> {
    // Get current database activity
    const activity = await this.sequelize.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE state = 'active') as active,
        COUNT(*) FILTER (WHERE state = 'idle') as idle,
        AVG(EXTRACT(epoch FROM (now() - query_start)) * 1000) 
          FILTER (WHERE state = 'active') as avg_query_time
      FROM pg_stat_activity
      WHERE datname = current_database()`,
      { type: QueryTypes.SELECT }
    );

    // Get cache statistics
    const cacheStats = await this.cache.getStats();

    // Count slow queries
    const slowQueries = this.getSlowQueries().length;

    return {
      activeQueries: activity[0].active || 0,
      avgQueryTime: activity[0].avg_query_time || 0,
      slowQueries,
      cacheHitRate: cacheStats.hitRate,
      connections: {
        active: activity[0].active || 0,
        idle: activity[0].idle || 0,
        total: activity[0].total || 0
      }
    };
  }

  // Private helper methods

  private extractMetrics(plan: any): {
    totalCost: number;
    rows: number;
    bufferHits: number;
    bufferMisses: number;
  } {
    return {
      totalCost: plan['Total Cost'] || 0,
      rows: plan['Actual Rows'] || 0,
      bufferHits: plan['Shared Hit Blocks'] || 0,
      bufferMisses: plan['Shared Read Blocks'] || 0
    };
  }

  private detectIssues(plan: any): string[] {
    const warnings: string[] = [];

    // Check for sequential scans on large tables
    if (plan['Node Type'] === 'Seq Scan' && plan['Actual Rows'] > 1000) {
      warnings.push(`Sequential scan on ${plan['Relation Name']} (${plan['Actual Rows']} rows)`);
    }

    // Check for missing indexes
    if (plan['Node Type'] === 'Seq Scan' && plan['Filter']) {
      warnings.push(`Possible missing index on ${plan['Relation Name']}`);
    }

    // Check for nested loops on large datasets
    if (plan['Node Type'] === 'Nested Loop' && plan['Actual Rows'] > 10000) {
      warnings.push('Nested loop join on large dataset');
    }

    // Check for sort operations
    if (plan['Node Type'] === 'Sort' && plan['Sort Space Used'] > 1024) {
      warnings.push(`Large sort operation (${plan['Sort Space Used']}KB)`);
    }

    // Recursively check child plans
    if (plan['Plans']) {
      for (const childPlan of plan['Plans']) {
        warnings.push(...this.detectIssues(childPlan));
      }
    }

    return warnings;
  }

  private generateSuggestions(plan: any, warnings: string[]): string[] {
    const suggestions: string[] = [];

    for (const warning of warnings) {
      if (warning.includes('Sequential scan')) {
        const match = warning.match(/on (\w+)/);
        if (match) {
          suggestions.push(`Consider adding an index on ${match[1]}`);
        }
      }

      if (warning.includes('missing index')) {
        suggestions.push('Analyze WHERE clause conditions for index opportunities');
      }

      if (warning.includes('Nested loop')) {
        suggestions.push('Consider using hash join or merge join for large datasets');
      }

      if (warning.includes('sort operation')) {
        suggestions.push('Consider adding an index on the ORDER BY columns');
      }
    }

    return [...new Set(suggestions)];
  }

  private findSequentialScans(plan: any, scans: any[] = []): any[] {
    if (plan['Node Type'] === 'Seq Scan') {
      scans.push({
        relation: plan['Relation Name'],
        rows: plan['Actual Rows'],
        cost: plan['Total Cost'],
        filterColumns: this.extractFilterColumns(plan['Filter'])
      });
    }

    if (plan['Plans']) {
      for (const childPlan of plan['Plans']) {
        this.findSequentialScans(childPlan, scans);
      }
    }

    return scans;
  }

  private extractFilterColumns(filter: string): string[] {
    if (!filter) return [];
    
    const columns: string[] = [];
    const columnRegex = /\((\w+)::\w+/g;
    let match;
    
    while ((match = columnRegex.exec(filter)) !== null) {
      columns.push(match[1]);
    }
    
    return [...new Set(columns)];
  }

  private normalizeQuery(query: string): string {
    return query
      .replace(/\s+/g, ' ')
      .replace(/\$\d+/g, '?')
      .replace(/'\d+'/g, '?')
      .trim()
      .toLowerCase();
  }

  private hashQuery(query: string): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(this.normalizeQuery(query)).digest('hex');
  }

  private generateOptimizedQuery(query: string, plan: QueryPlan): string {
    let optimized = query;

    // Add LIMIT if not present and large result set
    if (!query.toLowerCase().includes('limit') && plan.rows > 1000) {
      optimized += ' LIMIT 1000';
    }

    // Suggest index hints based on plan
    // This is a simplified example - real optimization would be more complex

    return optimized;
  }

  private async analyzeSlowQuery(query: string): Promise<void> {
    try {
      const plan = await this.analyzeQuery(query);
      
      if (plan.warnings.length > 0 || plan.suggestions.length > 0) {
        this.logger.warn('Slow query analysis', {
          query: this.normalizeQuery(query),
          warnings: plan.warnings,
          suggestions: plan.suggestions,
          cost: plan.cost,
          executionTime: plan.executionTime
        });
      }
    } catch (error) {
      this.logger.error('Failed to analyze slow query', error);
    }
  }
}