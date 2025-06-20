// Distributed tracing for tracking requests across microservices

import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../logger';

// Trace context
export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  flags: number;
  baggage?: Record<string, string>;
}

// Span data
export interface SpanData {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  serviceName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'ok' | 'error' | 'cancelled';
  attributes: Record<string, any>;
  events: SpanEvent[];
  links: SpanLink[];
}

// Span event
export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: Record<string, any>;
}

// Span link
export interface SpanLink {
  traceId: string;
  spanId: string;
  attributes?: Record<string, any>;
}

// Span status
export enum SpanStatus {
  OK = 'ok',
  ERROR = 'error',
  CANCELLED = 'cancelled',
}

// Span kind
export enum SpanKind {
  INTERNAL = 'internal',
  SERVER = 'server',
  CLIENT = 'client',
  PRODUCER = 'producer',
  CONSUMER = 'consumer',
}

// Tracer configuration
export interface TracerConfig {
  serviceName: string;
  logger?: Logger;
  sampler?: Sampler;
  exporter?: SpanExporter;
  propagator?: TracePropagator;
}

// Sampling decision
export interface SamplingDecision {
  shouldSample: boolean;
  attributes?: Record<string, any>;
}

// Sampler interface
export interface Sampler {
  shouldSample(context: TraceContext, operationName: string): SamplingDecision;
}

// Span exporter interface
export interface SpanExporter {
  export(spans: SpanData[]): Promise<void>;
}

// Trace propagator interface
export interface TracePropagator {
  inject(context: TraceContext, carrier: any): void;
  extract(carrier: any): TraceContext | null;
}

// Always sample
export class AlwaysSampler implements Sampler {
  shouldSample(): SamplingDecision {
    return { shouldSample: true };
  }
}

// Probability sampler
export class ProbabilitySampler implements Sampler {
  constructor(private probability: number) {}

  shouldSample(): SamplingDecision {
    return { shouldSample: Math.random() < this.probability };
  }
}

// Console span exporter
export class ConsoleSpanExporter implements SpanExporter {
  constructor(private logger?: Logger) {}

  async export(spans: SpanData[]): Promise<void> {
    for (const span of spans) {
      this.logger?.info('Span exported', span);
    }
  }
}

// HTTP headers propagator
export class HttpHeadersPropagator implements TracePropagator {
  private static readonly TRACE_HEADER = 'x-trace-id';
  private static readonly SPAN_HEADER = 'x-span-id';
  private static readonly PARENT_HEADER = 'x-parent-span-id';
  private static readonly FLAGS_HEADER = 'x-trace-flags';
  private static readonly BAGGAGE_PREFIX = 'x-trace-baggage-';

  inject(context: TraceContext, carrier: any): void {
    carrier[HttpHeadersPropagator.TRACE_HEADER] = context.traceId;
    carrier[HttpHeadersPropagator.SPAN_HEADER] = context.spanId;
    
    if (context.parentSpanId) {
      carrier[HttpHeadersPropagator.PARENT_HEADER] = context.parentSpanId;
    }
    
    carrier[HttpHeadersPropagator.FLAGS_HEADER] = context.flags.toString();
    
    // Inject baggage
    if (context.baggage) {
      for (const [key, value] of Object.entries(context.baggage)) {
        carrier[`${HttpHeadersPropagator.BAGGAGE_PREFIX}${key}`] = value;
      }
    }
  }

  extract(carrier: any): TraceContext | null {
    const traceId = carrier[HttpHeadersPropagator.TRACE_HEADER];
    const spanId = carrier[HttpHeadersPropagator.SPAN_HEADER];
    
    if (!traceId || !spanId) {
      return null;
    }

    const context: TraceContext = {
      traceId,
      spanId,
      parentSpanId: carrier[HttpHeadersPropagator.PARENT_HEADER],
      flags: parseInt(carrier[HttpHeadersPropagator.FLAGS_HEADER] || '0'),
      baggage: {},
    };

    // Extract baggage
    for (const [key, value] of Object.entries(carrier)) {
      if (key.startsWith(HttpHeadersPropagator.BAGGAGE_PREFIX)) {
        const baggageKey = key.substring(HttpHeadersPropagator.BAGGAGE_PREFIX.length);
        context.baggage![baggageKey] = value as string;
      }
    }

    return context;
  }
}

// Span implementation
export class Span {
  private data: SpanData;
  private tracer: Tracer;

  constructor(tracer: Tracer, context: TraceContext, operationName: string) {
    this.tracer = tracer;
    this.data = {
      traceId: context.traceId,
      spanId: context.spanId,
      parentSpanId: context.parentSpanId,
      operationName,
      serviceName: tracer.getServiceName(),
      startTime: Date.now(),
      status: 'ok',
      attributes: {},
      events: [],
      links: [],
    };
  }

  // Set attribute
  setAttribute(key: string, value: any): this {
    this.data.attributes[key] = value;
    return this;
  }

  // Set attributes
  setAttributes(attributes: Record<string, any>): this {
    Object.assign(this.data.attributes, attributes);
    return this;
  }

  // Add event
  addEvent(name: string, attributes?: Record<string, any>): this {
    this.data.events.push({
      name,
      timestamp: Date.now(),
      attributes,
    });
    return this;
  }

  // Add link
  addLink(traceId: string, spanId: string, attributes?: Record<string, any>): this {
    this.data.links.push({
      traceId,
      spanId,
      attributes,
    });
    return this;
  }

  // Set status
  setStatus(status: SpanStatus, message?: string): this {
    this.data.status = status;
    
    if (message) {
      this.setAttribute('status.message', message);
    }
    
    return this;
  }

  // End span
  end(): void {
    this.data.endTime = Date.now();
    this.data.duration = this.data.endTime - this.data.startTime;
    
    this.tracer.endSpan(this.data);
  }

  // Get context
  getContext(): TraceContext {
    return {
      traceId: this.data.traceId,
      spanId: this.data.spanId,
      parentSpanId: this.data.parentSpanId,
      flags: 1, // Sampled
    };
  }
}

// Tracer implementation
export class Tracer {
  private config: TracerConfig;
  private logger?: Logger;
  private sampler: Sampler;
  private exporter?: SpanExporter;
  private propagator: TracePropagator;
  private pendingSpans: SpanData[] = [];
  private exportTimer?: NodeJS.Timer;

  constructor(config: TracerConfig) {
    this.config = config;
    this.logger = config.logger;
    this.sampler = config.sampler || new AlwaysSampler();
    this.exporter = config.exporter;
    this.propagator = config.propagator || new HttpHeadersPropagator();

    // Start export timer
    if (this.exporter) {
      this.exportTimer = setInterval(() => this.exportSpans(), 5000);
    }
  }

  // Start span
  startSpan(operationName: string, context?: TraceContext): Span | null {
    const spanContext = context || this.createContext();
    
    // Check sampling decision
    const decision = this.sampler.shouldSample(spanContext, operationName);
    
    if (!decision.shouldSample) {
      return null;
    }

    const span = new Span(this, spanContext, operationName);
    
    if (decision.attributes) {
      span.setAttributes(decision.attributes);
    }

    this.logger?.debug('Span started', {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
      operationName,
    });

    return span;
  }

  // Start child span
  startChildSpan(operationName: string, parent: Span): Span | null {
    const parentContext = parent.getContext();
    
    const childContext: TraceContext = {
      traceId: parentContext.traceId,
      spanId: uuidv4(),
      parentSpanId: parentContext.spanId,
      flags: parentContext.flags,
      baggage: parentContext.baggage,
    };

    return this.startSpan(operationName, childContext);
  }

  // End span
  endSpan(spanData: SpanData): void {
    this.pendingSpans.push(spanData);

    this.logger?.debug('Span ended', {
      traceId: spanData.traceId,
      spanId: spanData.spanId,
      operationName: spanData.operationName,
      duration: spanData.duration,
    });

    // Export immediately if batch is large
    if (this.pendingSpans.length >= 100) {
      this.exportSpans();
    }
  }

  // Inject trace context
  inject(context: TraceContext, carrier: any): void {
    this.propagator.inject(context, carrier);
  }

  // Extract trace context
  extract(carrier: any): TraceContext | null {
    return this.propagator.extract(carrier);
  }

  // Create new context
  private createContext(): TraceContext {
    return {
      traceId: uuidv4(),
      spanId: uuidv4(),
      flags: 1, // Sampled
    };
  }

  // Export spans
  private async exportSpans(): Promise<void> {
    if (this.pendingSpans.length === 0 || !this.exporter) {
      return;
    }

    const spans = [...this.pendingSpans];
    this.pendingSpans = [];

    try {
      await this.exporter.export(spans);
    } catch (error) {
      this.logger?.error('Failed to export spans', error as Error);
      
      // Put spans back if export failed
      this.pendingSpans.unshift(...spans);
    }
  }

  // Get service name
  getServiceName(): string {
    return this.config.serviceName;
  }

  // Shutdown tracer
  async shutdown(): Promise<void> {
    if (this.exportTimer) {
      clearInterval(this.exportTimer);
    }

    await this.exportSpans();
  }
}

// Express middleware for tracing
export const tracingMiddleware = (tracer: Tracer) => {
  return (req: any, res: any, next: any) => {
    // Extract context from headers
    const context = tracer.extract(req.headers);
    
    // Start span
    const span = tracer.startSpan(`${req.method} ${req.path}`, context);
    
    if (span) {
      // Set span attributes
      span.setAttributes({
        'http.method': req.method,
        'http.url': req.url,
        'http.target': req.path,
        'http.host': req.hostname,
        'http.scheme': req.protocol,
        'http.user_agent': req.headers['user-agent'],
        'http.remote_addr': req.ip,
      });

      // Inject context into request
      req.span = span;
      req.traceContext = span.getContext();

      // Inject context into response headers
      tracer.inject(span.getContext(), res.headers);

      // Hook into response
      const originalSend = res.send;
      res.send = function(data: any) {
        span.setAttribute('http.status_code', res.statusCode);
        
        if (res.statusCode >= 400) {
          span.setStatus(SpanStatus.ERROR, `HTTP ${res.statusCode}`);
        }
        
        span.end();
        
        return originalSend.call(this, data);
      };
    }

    next();
  };
};

// Create tracer instance
export const createTracer = (config: TracerConfig): Tracer => {
  return new Tracer(config);
};