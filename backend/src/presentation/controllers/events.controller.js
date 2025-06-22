const { container } = require('../../infrastructure/container');
const { EventMapper } = require('../../application/mappers/js-wrappers/EventMapper');

class EventsController {
  constructor() {
    this.getEventsUseCase = container.get('getEventsUseCase');
    this.getEventByIdUseCase = container.get('getEventByIdUseCase');
    this.createEventUseCase = container.get('createEventUseCase');
    this.updateEventUseCase = container.get('updateEventUseCase');
    this.resolveEventUseCase = container.get('resolveEventUseCase');
    this.getEventStatisticsUseCase = container.get('getEventStatisticsUseCase');
  }

  async getEvents(req, res, next) {
    try {
      const { 
        buildingId, 
        type, 
        severity, 
        resolved, 
        startDate, 
        endDate,
        page = 1, 
        limit = 20 
      } = req.query;
      
      // Prepare filters
      const filters = {};
      if (buildingId) filters.buildingId = buildingId;
      if (type) filters.type = type;
      if (severity) filters.severity = severity;
      if (resolved !== undefined) filters.resolved = resolved === 'true';
      
      if (startDate || endDate) {
        if (startDate) filters.startDate = new Date(startDate);
        if (endDate) filters.endDate = new Date(endDate);
      }
      
      // Prepare pagination
      const pagination = {
        page: parseInt(page),
        limit: parseInt(limit)
      };
      
      // Execute use case
      const result = await this.getEventsUseCase.execute({ filters, pagination });
      
      // Map to DTOs
      const events = result.items.map(event => {
        // Check if event has relations
        if (event.Building || event.User) {
          return EventMapper.toDTOWithRelations(event);
        }
        return EventMapper.toDTO(event);
      });
      
      res.json({
        events,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages
      });
    } catch (error) {
      next(error);
    }
  }

  async getEventById(req, res, next) {
    try {
      const { id } = req.params;
      
      const event = await this.getEventByIdUseCase.execute({ eventId: id });
      const eventDTO = event.Building || event.User 
        ? EventMapper.toDTOWithRelations(event) 
        : EventMapper.toDTO(event);
      
      res.json(eventDTO);
    } catch (error) {
      if (error.message === 'Event not found') {
        res.status(404).json({ error: error.message });
      } else {
        next(error);
      }
    }
  }

  async createEvent(req, res, next) {
    try {
      const { buildingId, type, description, metadata, severity } = req.body;
      
      const event = await this.createEventUseCase.execute({
        buildingId,
        userId: req.user.id,
        type,
        description,
        metadata,
        severity
      });
      
      const eventDTO = event.Building || event.User 
        ? EventMapper.toDTOWithRelations(event) 
        : EventMapper.toDTO(event);
      
      res.status(201).json(eventDTO);
    } catch (error) {
      next(error);
    }
  }

  async updateEvent(req, res, next) {
    try {
      const { id } = req.params;
      const { type, description, metadata, severity, resolved } = req.body;
      
      const data = {};
      if (type !== undefined) data.type = type;
      if (description !== undefined) data.description = description;
      if (metadata !== undefined) data.metadata = metadata;
      if (severity !== undefined) data.severity = severity;
      if (resolved !== undefined) data.resolved = resolved;
      
      const event = await this.updateEventUseCase.execute({
        eventId: id,
        data
      });
      
      const eventDTO = event.Building || event.User 
        ? EventMapper.toDTOWithRelations(event) 
        : EventMapper.toDTO(event);
      
      res.json(eventDTO);
    } catch (error) {
      if (error.message === 'Event not found') {
        res.status(404).json({ error: error.message });
      } else {
        next(error);
      }
    }
  }

  async resolveEvent(req, res, next) {
    try {
      const { id } = req.params;
      
      const event = await this.resolveEventUseCase.execute({
        eventId: id,
        userId: req.user.id
      });
      
      const eventDTO = event.Building || event.User 
        ? EventMapper.toDTOWithRelations(event) 
        : EventMapper.toDTO(event);
      
      res.json(eventDTO);
    } catch (error) {
      if (error.message === 'Event not found') {
        res.status(404).json({ error: error.message });
      } else if (error.message === 'Event already resolved') {
        res.status(400).json({ error: error.message });
      } else {
        next(error);
      }
    }
  }

  async getEventStats(req, res, next) {
    try {
      const { buildingId } = req.query;
      
      const stats = await this.getEventStatisticsUseCase.execute({ buildingId });
      
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = EventsController;