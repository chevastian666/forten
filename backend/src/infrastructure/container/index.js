// JavaScript version of the dependency injection container
// This allows us to use Clean Architecture patterns in the existing JavaScript environment

const { SequelizeUserRepository } = require('../repositories/js-wrappers/SequelizeUserRepository');
const { SequelizeBuildingRepository } = require('../repositories/js-wrappers/SequelizeBuildingRepository');
const { SequelizeAccessRepository } = require('../repositories/js-wrappers/SequelizeAccessRepository');
const { SequelizeEventRepository } = require('../repositories/js-wrappers/SequelizeEventRepository');
const { JwtAuthService } = require('../services/js-wrappers/JwtAuthService');
const { SocketEventService } = require('../services/js-wrappers/SocketEventService');
const { LoginUseCase } = require('../../application/use-cases/js-wrappers/auth/LoginUseCase');
const { RefreshTokenUseCase } = require('../../application/use-cases/js-wrappers/auth/RefreshTokenUseCase');
const { CreateBuildingUseCase } = require('../../application/use-cases/js-wrappers/building/CreateBuildingUseCase');
const { GetBuildingsUseCase } = require('../../application/use-cases/js-wrappers/building/GetBuildingsUseCase');
const { GetBuildingByIdUseCase } = require('../../application/use-cases/js-wrappers/building/GetBuildingByIdUseCase');
const { UpdateBuildingUseCase } = require('../../application/use-cases/js-wrappers/building/UpdateBuildingUseCase');
const { DeleteBuildingUseCase } = require('../../application/use-cases/js-wrappers/building/DeleteBuildingUseCase');
const { CreateAccessUseCase } = require('../../application/use-cases/js-wrappers/access/CreateAccessUseCase');
const { ValidateAccessUseCase } = require('../../application/use-cases/js-wrappers/access/ValidateAccessUseCase');
const { GetAccessesUseCase } = require('../../application/use-cases/js-wrappers/access/GetAccessesUseCase');
const { GetAccessByIdUseCase } = require('../../application/use-cases/js-wrappers/access/GetAccessByIdUseCase');
const { UpdateAccessUseCase } = require('../../application/use-cases/js-wrappers/access/UpdateAccessUseCase');
const { DeleteAccessUseCase } = require('../../application/use-cases/js-wrappers/access/DeleteAccessUseCase');
const { GenerateAccessReportUseCase } = require('../../application/use-cases/js-wrappers/access/GenerateAccessReportUseCase');
const { CreateEventUseCase } = require('../../application/use-cases/js-wrappers/event/CreateEventUseCase');
const { ResolveEventUseCase } = require('../../application/use-cases/js-wrappers/event/ResolveEventUseCase');
const { GetEventsUseCase } = require('../../application/use-cases/js-wrappers/event/GetEventsUseCase');
const { GetEventByIdUseCase } = require('../../application/use-cases/js-wrappers/event/GetEventByIdUseCase');
const { UpdateEventUseCase } = require('../../application/use-cases/js-wrappers/event/UpdateEventUseCase');
const { GetEventStatisticsUseCase } = require('../../application/use-cases/js-wrappers/event/GetEventStatisticsUseCase');
const { createMiddlewareRegistry } = require('../middleware');

class Container {
  constructor() {
    this.services = new Map();
    this.initializeServices();
  }

  initializeServices() {
    // Repositories
    this.services.set('userRepository', new SequelizeUserRepository());
    this.services.set('buildingRepository', new SequelizeBuildingRepository());
    this.services.set('accessRepository', new SequelizeAccessRepository());
    this.services.set('eventRepository', new SequelizeEventRepository());

    // Services
    this.services.set('authService', new JwtAuthService());
    this.services.set('eventService', new SocketEventService());

    // Auth Use Cases
    this.services.set(
      'loginUseCase',
      new LoginUseCase(
        this.services.get('userRepository'),
        this.services.get('authService')
      )
    );

    this.services.set(
      'refreshTokenUseCase',
      new RefreshTokenUseCase(
        this.services.get('userRepository'),
        this.services.get('authService')
      )
    );

    // Building Use Cases
    this.services.set(
      'createBuildingUseCase',
      new CreateBuildingUseCase(
        this.services.get('buildingRepository'),
        this.services.get('eventRepository')
      )
    );

    this.services.set(
      'getBuildingsUseCase',
      new GetBuildingsUseCase(this.services.get('buildingRepository'))
    );

    this.services.set(
      'getBuildingByIdUseCase',
      new GetBuildingByIdUseCase(
        this.services.get('buildingRepository'),
        this.services.get('eventRepository')
      )
    );

    this.services.set(
      'updateBuildingUseCase',
      new UpdateBuildingUseCase(
        this.services.get('buildingRepository'),
        this.services.get('eventRepository')
      )
    );

    this.services.set(
      'deleteBuildingUseCase',
      new DeleteBuildingUseCase(
        this.services.get('buildingRepository'),
        this.services.get('eventRepository')
      )
    );

    // Access Use Cases
    this.services.set(
      'createAccessUseCase',
      new CreateAccessUseCase(
        this.services.get('accessRepository'),
        this.services.get('eventRepository')
      )
    );

    this.services.set(
      'validateAccessUseCase',
      new ValidateAccessUseCase(
        this.services.get('accessRepository'),
        this.services.get('eventRepository')
      )
    );

    this.services.set(
      'getAccessesUseCase',
      new GetAccessesUseCase(this.services.get('accessRepository'))
    );

    this.services.set(
      'getAccessByIdUseCase',
      new GetAccessByIdUseCase(this.services.get('accessRepository'))
    );

    this.services.set(
      'updateAccessUseCase',
      new UpdateAccessUseCase(
        this.services.get('accessRepository'),
        this.services.get('eventRepository')
      )
    );

    this.services.set(
      'deleteAccessUseCase',
      new DeleteAccessUseCase(
        this.services.get('accessRepository'),
        this.services.get('eventRepository')
      )
    );

    this.services.set(
      'generateAccessReportUseCase',
      new GenerateAccessReportUseCase(this.services.get('accessRepository'))
    );

    // Event Use Cases
    this.services.set(
      'createEventUseCase',
      new CreateEventUseCase(
        this.services.get('eventRepository'),
        this.services.get('eventService')
      )
    );

    this.services.set(
      'resolveEventUseCase',
      new ResolveEventUseCase(this.services.get('eventRepository'))
    );

    this.services.set(
      'getEventsUseCase',
      new GetEventsUseCase(this.services.get('eventRepository'))
    );

    this.services.set(
      'getEventByIdUseCase',
      new GetEventByIdUseCase(this.services.get('eventRepository'))
    );

    this.services.set(
      'updateEventUseCase',
      new UpdateEventUseCase(this.services.get('eventRepository'))
    );

    this.services.set(
      'getEventStatisticsUseCase',
      new GetEventStatisticsUseCase(this.services.get('eventRepository'))
    );

    // Middleware Registry
    this.services.set('middlewareRegistry', createMiddlewareRegistry(this));
  }

  get(serviceName) {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }
    return service;
  }
}

// Singleton instance
let instance = null;

const getInstance = () => {
  if (!instance) {
    instance = new Container();
  }
  return instance;
};

module.exports.container = getInstance();