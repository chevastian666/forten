import { 
  IEventRepository, 
  EventFilters, 
  EventStats 
} from '../../domain/repositories/IEventRepository';
import { PaginationOptions, PaginatedResult } from '../../domain/repositories/IBuildingRepository';
import { Event } from '../../domain/entities/Event';
import { EventMapper } from '../mappers/EventMapper';
import { Op } from 'sequelize';
import sequelize from 'sequelize';

// Import the Sequelize models
const EventModel = require('../../models/Event');
const BuildingModel = require('../../models/Building');
const UserModel = require('../../models/User');

export class SequelizeEventRepository implements IEventRepository {
  async findById(id: string): Promise<Event | null> {
    try {
      const eventRecord = await EventModel.findByPk(id, {
        include: [
          { model: BuildingModel, attributes: ['id', 'name'] },
          { model: UserModel, attributes: ['id', 'firstName', 'lastName'] }
        ]
      });
      if (!eventRecord) {
        return null;
      }
      const eventData = eventRecord.toJSON();
      const event = EventMapper.toDomain(eventData);
      
      // Add relations to the event object
      if (eventData.Building) {
        (event as any).Building = eventData.Building;
      }
      if (eventData.User) {
        (event as any).User = eventData.User;
      }
      
      return event;
    } catch (error) {
      console.error('Error finding event by id:', error);
      throw new Error('Failed to find event');
    }
  }

  async findAll(
    filters?: EventFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Event>> {
    try {
      const where: any = {};
      
      if (filters?.buildingId) {
        where.buildingId = filters.buildingId;
      }
      
      if (filters?.type) {
        where.type = filters.type;
      }
      
      if (filters?.severity) {
        where.severity = filters.severity;
      }
      
      if (filters?.resolved !== undefined) {
        where.resolved = filters.resolved;
      }
      
      if (filters?.startDate && filters?.endDate) {
        where.createdAt = {
          [Op.between]: [filters.startDate, filters.endDate]
        };
      } else if (filters?.startDate) {
        where.createdAt = {
          [Op.gte]: filters.startDate
        };
      } else if (filters?.endDate) {
        where.createdAt = {
          [Op.lte]: filters.endDate
        };
      }
      
      // Set default pagination values
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 10;
      const offset = (page - 1) * limit;
      
      const { count, rows } = await EventModel.findAndCountAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
        include: [
          { model: BuildingModel, attributes: ['id', 'name'] },
          { model: UserModel, attributes: ['id', 'firstName', 'lastName'] }
        ]
      });
      
      const events = rows.map((record: any) => {
        const eventData = record.toJSON();
        const event = EventMapper.toDomain(eventData);
        
        // Add relations to the event object
        if (eventData.Building) {
          (event as any).Building = eventData.Building;
        }
        if (eventData.User) {
          (event as any).User = eventData.User;
        }
        
        return event;
      });
      
      return {
        items: events,
        total: count,
        page,
        totalPages: Math.ceil(count / limit)
      };
    } catch (error) {
      console.error('Error finding all events:', error);
      throw new Error('Failed to find events');
    }
  }

  async create(event: Event): Promise<Event> {
    try {
      const eventData = EventMapper.toPersistence(event);
      const eventRecord = await EventModel.create(eventData);
      
      // Fetch the created event with relations
      const createdEvent = await EventModel.findByPk(eventRecord.id, {
        include: [
          { model: BuildingModel, attributes: ['id', 'name'] },
          { model: UserModel, attributes: ['id', 'firstName', 'lastName'] }
        ]
      });
      
      const eventDataWithRelations = createdEvent.toJSON();
      const domainEvent = EventMapper.toDomain(eventDataWithRelations);
      
      // Add relations to the event object
      if (eventDataWithRelations.Building) {
        (domainEvent as any).Building = eventDataWithRelations.Building;
      }
      if (eventDataWithRelations.User) {
        (domainEvent as any).User = eventDataWithRelations.User;
      }
      
      return domainEvent;
    } catch (error) {
      console.error('Error creating event:', error);
      throw new Error('Failed to create event');
    }
  }

  async update(id: string, event: Partial<Event>): Promise<Event | null> {
    try {
      const eventRecord = await EventModel.findByPk(id);
      if (!eventRecord) {
        return null;
      }
      
      // Remove undefined values and prepare update data
      const updateData: any = {};
      Object.keys(event).forEach(key => {
        if (event[key as keyof Event] !== undefined) {
          updateData[key] = event[key as keyof Event];
        }
      });
      
      await eventRecord.update(updateData);
      
      // Fetch the updated event with relations
      const updatedEvent = await EventModel.findByPk(id, {
        include: [
          { model: BuildingModel, attributes: ['id', 'name'] },
          { model: UserModel, attributes: ['id', 'firstName', 'lastName'] }
        ]
      });
      
      const eventDataWithRelations = updatedEvent.toJSON();
      const domainEvent = EventMapper.toDomain(eventDataWithRelations);
      
      // Add relations to the event object
      if (eventDataWithRelations.Building) {
        (domainEvent as any).Building = eventDataWithRelations.Building;
      }
      if (eventDataWithRelations.User) {
        (domainEvent as any).User = eventDataWithRelations.User;
      }
      
      return domainEvent;
    } catch (error) {
      console.error('Error updating event:', error);
      throw new Error('Failed to update event');
    }
  }

  async resolve(id: string, userId: string): Promise<Event | null> {
    try {
      const eventRecord = await EventModel.findByPk(id);
      if (!eventRecord) {
        return null;
      }
      
      await eventRecord.update({
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: userId
      });
      
      // Fetch the resolved event with relations
      const resolvedEvent = await EventModel.findByPk(id, {
        include: [
          { model: BuildingModel, attributes: ['id', 'name'] },
          { model: UserModel, attributes: ['id', 'firstName', 'lastName'] }
        ]
      });
      
      const eventDataWithRelations = resolvedEvent.toJSON();
      const domainEvent = EventMapper.toDomain(eventDataWithRelations);
      
      // Add relations to the event object
      if (eventDataWithRelations.Building) {
        (domainEvent as any).Building = eventDataWithRelations.Building;
      }
      if (eventDataWithRelations.User) {
        (domainEvent as any).User = eventDataWithRelations.User;
      }
      
      return domainEvent;
    } catch (error) {
      console.error('Error resolving event:', error);
      throw new Error('Failed to resolve event');
    }
  }

  async getStats(buildingId?: string): Promise<EventStats> {
    try {
      const where: any = {};
      if (buildingId) {
        where.buildingId = buildingId;
      }
      
      // Get total events
      const totalEvents = await EventModel.count({ where });
      
      // Get today's events
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      
      const todayEvents = await EventModel.count({
        where: {
          ...where,
          createdAt: {
            [Op.between]: [todayStart, todayEnd]
          }
        }
      });
      
      // Get unresolved events
      const unresolvedEvents = await EventModel.count({
        where: {
          ...where,
          resolved: false
        }
      });
      
      // Get events by type
      const eventsByType = await EventModel.findAll({
        where,
        attributes: [
          'type',
          [sequelize.fn('COUNT', sequelize.col('type')), 'count']
        ],
        group: ['type'],
        raw: true
      });
      
      const eventsByTypeMap: Record<string, number> = {};
      eventsByType.forEach((item: any) => {
        eventsByTypeMap[item.type] = parseInt(item.count);
      });
      
      return {
        totalEvents,
        todayEvents,
        unresolvedEvents,
        eventsByType: eventsByTypeMap
      };
    } catch (error) {
      console.error('Error getting event stats:', error);
      throw new Error('Failed to get event stats');
    }
  }

  async findUnresolved(buildingId?: string): Promise<Event[]> {
    try {
      const where: any = { resolved: false };
      if (buildingId) {
        where.buildingId = buildingId;
      }
      
      const eventRecords = await EventModel.findAll({
        where,
        order: [['severity', 'DESC'], ['createdAt', 'DESC']]
      });
      
      return eventRecords.map((record: any) => EventMapper.toDomain(record.toJSON()));
    } catch (error) {
      console.error('Error finding unresolved events:', error);
      throw new Error('Failed to find unresolved events');
    }
  }

  async findByBuilding(buildingId: string, limit?: number): Promise<Event[]> {
    try {
      const options: any = {
        where: { buildingId },
        order: [['createdAt', 'DESC']]
      };
      
      if (limit) {
        options.limit = limit;
      }
      
      const eventRecords = await EventModel.findAll(options);
      return eventRecords.map((record: any) => EventMapper.toDomain(record.toJSON()));
    } catch (error) {
      console.error('Error finding events by building:', error);
      throw new Error('Failed to find events by building');
    }
  }

  async findByBuildingId(buildingId: string, options?: { limit?: number }): Promise<Event[]> {
    try {
      const queryOptions: any = {
        where: { buildingId },
        order: [['createdAt', 'DESC']]
      };
      
      if (options?.limit) {
        queryOptions.limit = options.limit;
      }
      
      const eventRecords = await EventModel.findAll(queryOptions);
      return eventRecords.map((record: any) => EventMapper.toDomain(record.toJSON()));
    } catch (error) {
      console.error('Error finding events by building id:', error);
      throw new Error('Failed to find events by building id');
    }
  }
}