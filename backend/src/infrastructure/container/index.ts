import { SequelizeUserRepository } from '../repositories/SequelizeUserRepository';
import { SequelizeBuildingRepository } from '../repositories/SequelizeBuildingRepository';
import { SequelizeAccessRepository } from '../repositories/SequelizeAccessRepository';
import { SequelizeEventRepository } from '../repositories/SequelizeEventRepository';
import { JwtAuthService } from '../services/JwtAuthService';
import { SocketEventService } from '../services/SocketEventService';
import { LoginUseCase } from '../../application/use-cases/auth/LoginUseCase';
import { RefreshTokenUseCase } from '../../application/use-cases/auth/RefreshTokenUseCase';
import { CreateBuildingUseCase } from '../../application/use-cases/building/CreateBuildingUseCase';
import { GetBuildingsUseCase } from '../../application/use-cases/building/GetBuildingsUseCase';
import { CreateAccessUseCase } from '../../application/use-cases/access/CreateAccessUseCase';
import { ValidateAccessUseCase } from '../../application/use-cases/access/ValidateAccessUseCase';
import { CreateEventUseCase } from '../../application/use-cases/event/CreateEventUseCase';
import { ResolveEventUseCase } from '../../application/use-cases/event/ResolveEventUseCase';
import { GetEventsUseCase } from '../../application/use-cases/event/GetEventsUseCase';
import { GetEventByIdUseCase } from '../../application/use-cases/event/GetEventByIdUseCase';
import { UpdateEventUseCase } from '../../application/use-cases/event/UpdateEventUseCase';
import { GetEventStatisticsUseCase } from '../../application/use-cases/event/GetEventStatisticsUseCase';

class Container {
  private static instance: Container;
  private services: Map<string, any> = new Map();

  private constructor() {
    this.initializeServices();
  }

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  private initializeServices(): void {
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
      new CreateBuildingUseCase(this.services.get('buildingRepository'))
    );

    this.services.set(
      'getBuildingsUseCase',
      new GetBuildingsUseCase(this.services.get('buildingRepository'))
    );

    // Access Use Cases
    this.services.set(
      'createAccessUseCase',
      new CreateAccessUseCase(
        this.services.get('accessRepository'),
        this.services.get('userRepository'),
        this.services.get('buildingRepository')
      )
    );

    this.services.set(
      'validateAccessUseCase',
      new ValidateAccessUseCase(
        this.services.get('accessRepository'),
        this.services.get('eventRepository'),
        this.services.get('eventService')
      )
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
  }

  get<T>(serviceName: string): T {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }
    return service as T;
  }
}

export const container = Container.getInstance();