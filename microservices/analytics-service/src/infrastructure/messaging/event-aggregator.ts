// Event aggregator for analytics service

import {
  RabbitMQClient,
  Logger,
  EventType,
  AccessEventType,
  BaseEvent,
} from '@forten/shared';
import { DataAggregationUseCase } from '../../application/use-cases/DataAggregationUseCase';
import { CalculateMetricsUseCase } from '../../application/use-cases/CalculateMetricsUseCase';
import { IMetricRepository } from '../../domain/repositories/IMetricRepository';
import { IDatasetRepository } from '../../domain/repositories/IDatasetRepository';

// Time series data point
interface TimeSeriesDataPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

// Aggregation window
export enum AggregationWindow {
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export class AnalyticsEventAggregator {
  private rabbitmq: RabbitMQClient;
  private logger: Logger;
  private dataAggregationUseCase: DataAggregationUseCase;
  private metricsUseCase: CalculateMetricsUseCase;
  private metricRepository: IMetricRepository;
  private datasetRepository: IDatasetRepository;
  
  // In-memory buffers for real-time aggregation
  private eventBuffers: Map<string, BaseEvent[]> = new Map();
  private aggregationTimers: Map<string, NodeJS.Timer> = new Map();

  constructor(
    rabbitmq: RabbitMQClient,
    logger: Logger,
    dataAggregationUseCase: DataAggregationUseCase,
    metricsUseCase: CalculateMetricsUseCase,
    metricRepository: IMetricRepository,
    datasetRepository: IDatasetRepository
  ) {
    this.rabbitmq = rabbitmq;
    this.logger = logger;
    this.dataAggregationUseCase = dataAggregationUseCase;
    this.metricsUseCase = metricsUseCase;
    this.metricRepository = metricRepository;
    this.datasetRepository = datasetRepository;
  }

  // Subscribe to all events for analytics
  async subscribeToAllEvents(): Promise<void> {
    // Subscribe to all auth events
    const authEvents = [
      EventType.USER_CREATED,
      EventType.USER_LOGGED_IN,
      EventType.USER_LOGGED_OUT,
    ];

    for (const eventType of authEvents) {
      await this.rabbitmq.subscribe({
        eventType,
        handler: this.handleEvent.bind(this),
        queue: `analytics-service.${eventType}`,
      });
    }

    // Subscribe to all access events
    const accessEvents = [
      AccessEventType.ACCESS_GRANTED,
      AccessEventType.ACCESS_DENIED,
      AccessEventType.DOOR_OPENED,
      AccessEventType.DOOR_FORCED,
      AccessEventType.VISITOR_CHECKED_IN,
      AccessEventType.VISITOR_CHECKED_OUT,
    ];

    for (const eventType of accessEvents) {
      await this.rabbitmq.subscribe({
        eventType: eventType as any,
        handler: this.handleEvent.bind(this),
        queue: `analytics-service.${eventType}`,
      });
    }

    // Subscribe to monitoring events
    const monitoringEvents = [
      AccessEventType.CAMERA_OFFLINE,
      AccessEventType.CAMERA_ONLINE,
      AccessEventType.ALERT_TRIGGERED,
      AccessEventType.MOTION_DETECTED,
    ];

    for (const eventType of monitoringEvents) {
      await this.rabbitmq.subscribe({
        eventType: eventType as any,
        handler: this.handleEvent.bind(this),
        queue: `analytics-service.${eventType}`,
      });
    }

    // Subscribe to communication events
    const communicationEvents = [
      AccessEventType.NOTIFICATION_SENT,
      AccessEventType.NOTIFICATION_FAILED,
    ];

    for (const eventType of communicationEvents) {
      await this.rabbitmq.subscribe({
        eventType: eventType as any,
        handler: this.handleEvent.bind(this),
        queue: `analytics-service.${eventType}`,
      });
    }

    // Start aggregation timers
    this.startAggregationTimers();

    this.logger.info('Analytics service subscribed to all events');
  }

  // Handle incoming event
  private async handleEvent(event: BaseEvent): Promise<void> {
    try {
      // Buffer event for aggregation
      this.bufferEvent(event);

      // Process real-time metrics
      await this.processRealTimeMetrics(event);

      // Store raw event data
      await this.storeRawEvent(event);

    } catch (error) {
      this.logger.error('Failed to process event for analytics', error as Error, {
        eventId: event.id,
        eventType: event.type,
      });
    }
  }

  // Buffer event for batch processing
  private bufferEvent(event: BaseEvent): void {
    const key = `${event.type}:${this.getAggregationKey(event)}`;
    
    if (!this.eventBuffers.has(key)) {
      this.eventBuffers.set(key, []);
    }
    
    this.eventBuffers.get(key)!.push(event);
  }

  // Get aggregation key based on event type
  private getAggregationKey(event: BaseEvent): string {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}`;
  }

  // Process real-time metrics
  private async processRealTimeMetrics(event: BaseEvent): Promise<void> {
    switch (event.type) {
      case EventType.USER_LOGGED_IN:
        await this.incrementMetric('active_users', 1);
        await this.incrementMetric('login_count', 1);
        break;

      case AccessEventType.ACCESS_GRANTED as any:
        await this.incrementMetric('access_granted_count', 1);
        await this.updateAccessPatterns(event);
        break;

      case AccessEventType.ACCESS_DENIED as any:
        await this.incrementMetric('access_denied_count', 1);
        await this.updateSecurityMetrics(event);
        break;

      case AccessEventType.DOOR_FORCED as any:
        await this.incrementMetric('security_incidents', 1);
        await this.updateSecurityAlertMetrics(event);
        break;

      case AccessEventType.VISITOR_CHECKED_IN as any:
        await this.incrementMetric('visitor_count', 1);
        await this.updateVisitorMetrics(event);
        break;

      case AccessEventType.CAMERA_OFFLINE as any:
        await this.incrementMetric('camera_offline_count', 1);
        await this.updateSystemHealthMetrics(event);
        break;

      case AccessEventType.ALERT_TRIGGERED as any:
        await this.incrementMetric('alert_count', 1);
        await this.updateAlertMetrics(event);
        break;

      case AccessEventType.NOTIFICATION_SENT as any:
        await this.incrementMetric('notification_sent_count', 1);
        break;

      case AccessEventType.NOTIFICATION_FAILED as any:
        await this.incrementMetric('notification_failed_count', 1);
        break;
    }
  }

  // Increment a metric
  private async incrementMetric(name: string, value: number): Promise<void> {
    try {
      await this.metricsUseCase.incrementMetric({
        name,
        value,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Failed to increment metric', error as Error, { name, value });
    }
  }

  // Update access patterns
  private async updateAccessPatterns(event: BaseEvent): Promise<void> {
    const data = (event as any).data;
    
    // Track access by time of day
    const hour = new Date(event.timestamp).getHours();
    await this.incrementMetric(`access_by_hour:${hour}`, 1);
    
    // Track access by method
    if (data.accessMethod) {
      await this.incrementMetric(`access_by_method:${data.accessMethod}`, 1);
    }
    
    // Track access by building
    if (data.buildingId) {
      await this.incrementMetric(`access_by_building:${data.buildingId}`, 1);
    }
  }

  // Update security metrics
  private async updateSecurityMetrics(event: BaseEvent): Promise<void> {
    const data = (event as any).data;
    
    // Track denied access by reason
    if (data.reason) {
      await this.incrementMetric(`access_denied_by_reason:${data.reason}`, 1);
    }
    
    // Track security events by building
    if (data.buildingId) {
      await this.incrementMetric(`security_events_by_building:${data.buildingId}`, 1);
    }
  }

  // Update security alert metrics
  private async updateSecurityAlertMetrics(event: BaseEvent): Promise<void> {
    const data = (event as any).data;
    
    // Track by severity
    if (data.severity) {
      await this.incrementMetric(`security_alerts_by_severity:${data.severity}`, 1);
    }
  }

  // Update visitor metrics
  private async updateVisitorMetrics(event: BaseEvent): Promise<void> {
    const data = (event as any).data;
    
    // Track visitors by building
    if (data.buildingId) {
      await this.incrementMetric(`visitors_by_building:${data.buildingId}`, 1);
    }
    
    // Track visitors by purpose
    if (data.purpose) {
      await this.incrementMetric(`visitors_by_purpose:${data.purpose}`, 1);
    }
  }

  // Update system health metrics
  private async updateSystemHealthMetrics(event: BaseEvent): Promise<void> {
    const data = (event as any).data;
    
    // Track offline devices by building
    if (data.buildingId) {
      await this.incrementMetric(`offline_devices_by_building:${data.buildingId}`, 1);
    }
  }

  // Update alert metrics
  private async updateAlertMetrics(event: BaseEvent): Promise<void> {
    const data = (event as any).data;
    
    // Track alerts by type
    if (data.type) {
      await this.incrementMetric(`alerts_by_type:${data.type}`, 1);
    }
    
    // Track alerts by severity
    if (data.severity) {
      await this.incrementMetric(`alerts_by_severity:${data.severity}`, 1);
    }
  }

  // Store raw event data
  private async storeRawEvent(event: BaseEvent): Promise<void> {
    try {
      await this.datasetRepository.create({
        name: `raw_events_${event.type}`,
        type: 'timeseries',
        source: event.source,
        schema: {
          timestamp: 'datetime',
          eventId: 'string',
          eventType: 'string',
          data: 'json',
        },
        data: {
          timestamp: event.timestamp,
          eventId: event.id,
          eventType: event.type,
          data: event,
        },
      });
    } catch (error) {
      this.logger.error('Failed to store raw event', error as Error);
    }
  }

  // Start aggregation timers
  private startAggregationTimers(): void {
    // Minute aggregation
    this.aggregationTimers.set('minute', setInterval(() => {
      this.performAggregation(AggregationWindow.MINUTE);
    }, 60 * 1000));

    // Hour aggregation
    this.aggregationTimers.set('hour', setInterval(() => {
      this.performAggregation(AggregationWindow.HOUR);
    }, 60 * 60 * 1000));

    // Day aggregation
    this.aggregationTimers.set('day', setInterval(() => {
      this.performAggregation(AggregationWindow.DAY);
    }, 24 * 60 * 60 * 1000));
  }

  // Perform aggregation
  private async performAggregation(window: AggregationWindow): Promise<void> {
    this.logger.info('Performing aggregation', { window });

    try {
      // Process buffered events
      for (const [key, events] of this.eventBuffers.entries()) {
        if (events.length > 0) {
          await this.aggregateEvents(key, events, window);
          
          // Clear processed events
          this.eventBuffers.set(key, []);
        }
      }

      // Calculate derived metrics
      await this.calculateDerivedMetrics(window);

    } catch (error) {
      this.logger.error('Failed to perform aggregation', error as Error, { window });
    }
  }

  // Aggregate events
  private async aggregateEvents(
    key: string,
    events: BaseEvent[],
    window: AggregationWindow
  ): Promise<void> {
    const [eventType, timeKey] = key.split(':');
    
    const aggregatedData = {
      eventType,
      window,
      timeKey,
      count: events.length,
      firstEvent: events[0].timestamp,
      lastEvent: events[events.length - 1].timestamp,
      uniqueUsers: new Set(events.map(e => e.userId).filter(Boolean)).size,
    };

    await this.dataAggregationUseCase.aggregate({
      name: `${eventType}_${window}`,
      data: aggregatedData,
      timestamp: new Date(),
    });
  }

  // Calculate derived metrics
  private async calculateDerivedMetrics(window: AggregationWindow): Promise<void> {
    // Calculate access success rate
    const accessGranted = await this.metricRepository.getMetric('access_granted_count');
    const accessDenied = await this.metricRepository.getMetric('access_denied_count');
    
    if (accessGranted && accessDenied) {
      const total = accessGranted.value + accessDenied.value;
      const successRate = total > 0 ? (accessGranted.value / total) * 100 : 0;
      
      await this.metricsUseCase.calculateMetric({
        name: 'access_success_rate',
        formula: 'access_granted / (access_granted + access_denied)',
        value: successRate,
        unit: 'percentage',
        timestamp: new Date(),
      });
    }

    // Calculate system availability
    const cameraOffline = await this.metricRepository.getMetric('camera_offline_count');
    const totalCameras = await this.metricRepository.getMetric('total_cameras');
    
    if (cameraOffline && totalCameras && totalCameras.value > 0) {
      const availability = ((totalCameras.value - cameraOffline.value) / totalCameras.value) * 100;
      
      await this.metricsUseCase.calculateMetric({
        name: 'system_availability',
        formula: '(total_devices - offline_devices) / total_devices',
        value: availability,
        unit: 'percentage',
        timestamp: new Date(),
      });
    }

    // Calculate notification success rate
    const notificationSent = await this.metricRepository.getMetric('notification_sent_count');
    const notificationFailed = await this.metricRepository.getMetric('notification_failed_count');
    
    if (notificationSent && notificationFailed) {
      const total = notificationSent.value + notificationFailed.value;
      const successRate = total > 0 ? (notificationSent.value / total) * 100 : 0;
      
      await this.metricsUseCase.calculateMetric({
        name: 'notification_success_rate',
        formula: 'sent / (sent + failed)',
        value: successRate,
        unit: 'percentage',
        timestamp: new Date(),
      });
    }
  }

  // Stop aggregation
  stop(): void {
    for (const timer of this.aggregationTimers.values()) {
      clearInterval(timer);
    }
    
    this.aggregationTimers.clear();
    this.eventBuffers.clear();
  }
}