export enum QueryType {
  SELECT = 'SELECT',
  AGGREGATE = 'AGGREGATE',
  TIME_SERIES = 'TIME_SERIES',
  CROSS_TAB = 'CROSS_TAB',
  CUSTOM = 'CUSTOM'
}

export enum DataSourceType {
  POSTGRESQL = 'POSTGRESQL',
  TIMESCALEDB = 'TIMESCALEDB',
  REDIS = 'REDIS',
  ELASTICSEARCH = 'ELASTICSEARCH',
  API = 'API',
  FILE = 'FILE'
}

export interface QueryFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'like' | 'between' | 'null' | 'notnull';
  value: any;
  dataType?: 'string' | 'number' | 'date' | 'boolean' | 'array';
}

export interface QueryJoin {
  table: string;
  alias?: string;
  type: 'inner' | 'left' | 'right' | 'full';
  on: {
    leftField: string;
    rightField: string;
  };
}

export interface QueryAggregation {
  field: string;
  function: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'distinct' | 'median' | 'stddev';
  alias?: string;
}

export interface QueryGroupBy {
  field: string;
  interval?: string; // For time-based grouping (e.g., '1h', '1d', '1w')
}

export interface QueryOrderBy {
  field: string;
  direction: 'asc' | 'desc';
}

export interface QueryDefinition {
  type: QueryType;
  dataSource: DataSourceType;
  table: string;
  fields?: string[];
  filters?: QueryFilter[];
  joins?: QueryJoin[];
  aggregations?: QueryAggregation[];
  groupBy?: QueryGroupBy[];
  orderBy?: QueryOrderBy[];
  limit?: number;
  offset?: number;
  rawQuery?: string; // For custom queries
  parameters?: Record<string, any>;
}

export interface QueryResult {
  data: any[];
  metadata: {
    rowCount: number;
    executionTime: number;
    cacheHit: boolean;
    dataSource: DataSourceType;
  };
  schema?: {
    field: string;
    type: string;
    nullable: boolean;
  }[];
}

export class Query {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly definition: QueryDefinition,
    public readonly createdBy: string,
    public readonly isPublic: boolean,
    public readonly tags: string[],
    public readonly category: string,
    public readonly cacheDuration?: number, // in seconds
    public readonly lastExecuted?: Date,
    public readonly executionCount: number = 0,
    public readonly averageExecutionTime: number = 0,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date()
  ) {}

  static create(
    name: string,
    description: string,
    definition: QueryDefinition,
    createdBy: string,
    category: string,
    isPublic: boolean = false,
    tags: string[] = [],
    cacheDuration?: number
  ): Query {
    const id = `query-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return new Query(
      id,
      name,
      description,
      definition,
      createdBy,
      isPublic,
      tags,
      category,
      cacheDuration
    );
  }

  recordExecution(executionTime: number): Query {
    const newExecutionCount = this.executionCount + 1;
    const newAverageExecutionTime = 
      (this.averageExecutionTime * this.executionCount + executionTime) / newExecutionCount;

    return new Query(
      this.id,
      this.name,
      this.description,
      this.definition,
      this.createdBy,
      this.isPublic,
      this.tags,
      this.category,
      this.cacheDuration,
      new Date(),
      newExecutionCount,
      newAverageExecutionTime,
      this.createdAt,
      new Date()
    );
  }

  updateDefinition(definition: QueryDefinition): Query {
    return new Query(
      this.id,
      this.name,
      this.description,
      definition,
      this.createdBy,
      this.isPublic,
      this.tags,
      this.category,
      this.cacheDuration,
      this.lastExecuted,
      this.executionCount,
      this.averageExecutionTime,
      this.createdAt,
      new Date()
    );
  }

  buildSQL(): string {
    const { type, table, fields, filters, joins, aggregations, groupBy, orderBy, limit, offset, rawQuery } = this.definition;

    if (rawQuery) {
      return rawQuery;
    }

    let sql = '';

    switch (type) {
      case QueryType.SELECT:
        sql = this.buildSelectQuery();
        break;
      case QueryType.AGGREGATE:
        sql = this.buildAggregateQuery();
        break;
      case QueryType.TIME_SERIES:
        sql = this.buildTimeSeriesQuery();
        break;
      default:
        throw new Error(`Unsupported query type: ${type}`);
    }

    return sql;
  }

  private buildSelectQuery(): string {
    const { table, fields, filters, joins, orderBy, limit, offset } = this.definition;
    
    let sql = 'SELECT ';
    sql += fields && fields.length > 0 ? fields.join(', ') : '*';
    sql += ` FROM ${table}`;

    if (joins && joins.length > 0) {
      joins.forEach(join => {
        sql += ` ${join.type.toUpperCase()} JOIN ${join.table}`;
        if (join.alias) sql += ` AS ${join.alias}`;
        sql += ` ON ${join.on.leftField} = ${join.on.rightField}`;
      });
    }

    if (filters && filters.length > 0) {
      sql += ' WHERE ' + this.buildWhereClause(filters);
    }

    if (orderBy && orderBy.length > 0) {
      sql += ' ORDER BY ' + orderBy.map(o => `${o.field} ${o.direction.toUpperCase()}`).join(', ');
    }

    if (limit) sql += ` LIMIT ${limit}`;
    if (offset) sql += ` OFFSET ${offset}`;

    return sql;
  }

  private buildAggregateQuery(): string {
    const { table, aggregations, filters, groupBy, orderBy, limit } = this.definition;

    if (!aggregations || aggregations.length === 0) {
      throw new Error('Aggregate query requires at least one aggregation');
    }

    let sql = 'SELECT ';
    
    if (groupBy && groupBy.length > 0) {
      sql += groupBy.map(g => g.field).join(', ') + ', ';
    }

    sql += aggregations.map(agg => {
      const func = agg.function.toUpperCase();
      const alias = agg.alias || `${agg.function}_${agg.field}`;
      return `${func}(${agg.field}) AS ${alias}`;
    }).join(', ');

    sql += ` FROM ${table}`;

    if (filters && filters.length > 0) {
      sql += ' WHERE ' + this.buildWhereClause(filters);
    }

    if (groupBy && groupBy.length > 0) {
      sql += ' GROUP BY ' + groupBy.map(g => g.field).join(', ');
    }

    if (orderBy && orderBy.length > 0) {
      sql += ' ORDER BY ' + orderBy.map(o => `${o.field} ${o.direction.toUpperCase()}`).join(', ');
    }

    if (limit) sql += ` LIMIT ${limit}`;

    return sql;
  }

  private buildTimeSeriesQuery(): string {
    const { table, aggregations, filters, groupBy } = this.definition;

    if (!groupBy || groupBy.length === 0 || !groupBy[0].interval) {
      throw new Error('Time series query requires time-based grouping');
    }

    const timeGroup = groupBy[0];
    let sql = 'SELECT ';
    
    sql += `time_bucket('${timeGroup.interval}', ${timeGroup.field}) AS time_bucket, `;
    
    if (aggregations && aggregations.length > 0) {
      sql += aggregations.map(agg => {
        const func = agg.function.toUpperCase();
        const alias = agg.alias || `${agg.function}_${agg.field}`;
        return `${func}(${agg.field}) AS ${alias}`;
      }).join(', ');
    } else {
      sql += 'COUNT(*) as count';
    }

    sql += ` FROM ${table}`;

    if (filters && filters.length > 0) {
      sql += ' WHERE ' + this.buildWhereClause(filters);
    }

    sql += ' GROUP BY time_bucket';
    sql += ' ORDER BY time_bucket ASC';

    return sql;
  }

  private buildWhereClause(filters: QueryFilter[]): string {
    return filters.map(filter => {
      switch (filter.operator) {
        case 'eq':
          return `${filter.field} = '${filter.value}'`;
        case 'ne':
          return `${filter.field} != '${filter.value}'`;
        case 'gt':
          return `${filter.field} > ${filter.value}`;
        case 'gte':
          return `${filter.field} >= ${filter.value}`;
        case 'lt':
          return `${filter.field} < ${filter.value}`;
        case 'lte':
          return `${filter.field} <= ${filter.value}`;
        case 'in':
          return `${filter.field} IN (${filter.value.map((v: any) => `'${v}'`).join(', ')})`;
        case 'nin':
          return `${filter.field} NOT IN (${filter.value.map((v: any) => `'${v}'`).join(', ')})`;
        case 'like':
          return `${filter.field} LIKE '%${filter.value}%'`;
        case 'between':
          return `${filter.field} BETWEEN ${filter.value[0]} AND ${filter.value[1]}`;
        case 'null':
          return `${filter.field} IS NULL`;
        case 'notnull':
          return `${filter.field} IS NOT NULL`;
        default:
          throw new Error(`Unsupported operator: ${filter.operator}`);
      }
    }).join(' AND ');
  }

  canUserAccess(userId: string, userRole?: string): boolean {
    return this.isPublic || this.createdBy === userId;
  }

  isCacheable(): boolean {
    return this.cacheDuration !== undefined && this.cacheDuration > 0;
  }

  getCacheKey(): string {
    const definitionHash = JSON.stringify(this.definition);
    return `query:${this.id}:${Buffer.from(definitionHash).toString('base64')}`;
  }
}