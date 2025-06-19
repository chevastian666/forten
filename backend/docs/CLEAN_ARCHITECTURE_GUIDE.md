# Guía de Clean Architecture - FORTEN Backend

## Introducción

Esta guía explica cómo trabajar con la nueva arquitectura del backend de FORTEN y cómo agregar nuevas funcionalidades siguiendo los principios establecidos.

## Agregando una Nueva Funcionalidad

### Ejemplo: Sistema de Notificaciones

Supongamos que queremos agregar un sistema de notificaciones. Estos son los pasos:

### 1. Definir la Entidad del Dominio

```typescript
// src/domain/entities/Notification.ts
export class Notification {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly type: NotificationType,
    public readonly title: string,
    public readonly message: string,
    public readonly read: boolean = false,
    public readonly metadata?: any,
    public readonly createdAt: Date = new Date()
  ) {}

  markAsRead(): Notification {
    return new Notification(
      this.id,
      this.userId,
      this.type,
      this.title,
      this.message,
      true,
      this.metadata,
      this.createdAt
    );
  }
}

export enum NotificationType {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  SUCCESS = 'success'
}
```

### 2. Crear la Interfaz del Repositorio

```typescript
// src/domain/repositories/INotificationRepository.ts
export interface INotificationRepository {
  create(notification: Notification): Promise<Notification>;
  findById(id: string): Promise<Notification | null>;
  findByUserId(userId: string, options?: PaginationOptions): Promise<{
    items: Notification[];
    total: number;
  }>;
  markAsRead(id: string): Promise<void>;
  markAllAsReadForUser(userId: string): Promise<void>;
}
```

### 3. Crear el DTO

```typescript
// src/application/dtos/NotificationDTO.ts
export interface NotificationDTO {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  metadata?: any;
  createdAt: string;
}

export interface CreateNotificationDTO {
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: any;
}
```

### 4. Crear el Mapper

```typescript
// src/application/mappers/NotificationMapper.ts
export class NotificationMapper {
  static toDTO(notification: Notification): NotificationDTO {
    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      read: notification.read,
      metadata: notification.metadata,
      createdAt: notification.createdAt.toISOString()
    };
  }

  static toDomain(data: any): Notification {
    return new Notification(
      data.id,
      data.userId,
      data.type,
      data.title,
      data.message,
      data.read,
      data.metadata,
      new Date(data.createdAt)
    );
  }
}
```

### 5. Crear los Casos de Uso

```typescript
// src/application/use-cases/notification/CreateNotificationUseCase.ts
export class CreateNotificationUseCase {
  constructor(
    private notificationRepository: INotificationRepository,
    private eventService: IEventService
  ) {}

  async execute(data: CreateNotificationDTO): Promise<NotificationDTO> {
    const notification = new Notification(
      uuidv4(),
      data.userId,
      data.type as NotificationType,
      data.title,
      data.message,
      false,
      data.metadata
    );

    const saved = await this.notificationRepository.create(notification);
    
    // Emitir evento en tiempo real
    await this.eventService.emitToUser(data.userId, 'notification:new', {
      notification: NotificationMapper.toDTO(saved)
    });

    return NotificationMapper.toDTO(saved);
  }
}
```

### 6. Implementar el Repositorio

```typescript
// src/infrastructure/repositories/SequelizeNotificationRepository.ts
export class SequelizeNotificationRepository implements INotificationRepository {
  async create(notification: Notification): Promise<Notification> {
    const model = await NotificationModel.create({
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      read: notification.read,
      metadata: notification.metadata
    });

    return NotificationMapper.toDomain(model);
  }

  // ... resto de implementación
}
```

### 7. Crear el Controlador

```javascript
// src/presentation/controllers/notifications.controller.js
const createNotification = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const useCase = req.container.createNotificationUseCase;
    const notification = await useCase.execute(req.body);

    res.status(201).json(notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Error al crear notificación' });
  }
};
```

### 8. Actualizar el Container

```javascript
// src/infrastructure/container/index.js
// Agregar el repositorio
const notificationRepository = new SequelizeNotificationRepository();

// Agregar el caso de uso
const createNotificationUseCase = new CreateNotificationUseCase(
  notificationRepository,
  eventService
);

// Exportar
module.exports = {
  // ... otros exports
  createNotificationUseCase
};
```

## Mejores Prácticas

### 1. Mantener el Dominio Puro
- No importar librerías externas en el dominio
- No usar decoradores de ORM en entidades
- Mantener la lógica de negocio en las entidades

### 2. Casos de Uso Específicos
- Un caso de uso por acción
- Nombres descriptivos (CreateUserUseCase, no UserUseCase)
- Manejar una sola responsabilidad

### 3. Inyección de Dependencias
- Siempre inyectar dependencias por constructor
- Usar interfaces, no implementaciones concretas
- Facilitar el testing con mocks

### 4. Manejo de Errores
```typescript
// Crear errores de dominio específicos
export class NotificationNotFoundError extends Error {
  constructor(id: string) {
    super(`Notification with id ${id} not found`);
    this.name = 'NotificationNotFoundError';
  }
}

// Usar en casos de uso
const notification = await this.repository.findById(id);
if (!notification) {
  throw new NotificationNotFoundError(id);
}
```

### 5. Testing
```typescript
// tests/unit/use-cases/notification/CreateNotificationUseCase.test.ts
describe('CreateNotificationUseCase', () => {
  let useCase: CreateNotificationUseCase;
  let mockRepository: MockNotificationRepository;
  let mockEventService: MockEventService;

  beforeEach(() => {
    mockRepository = new MockNotificationRepository();
    mockEventService = new MockEventService();
    useCase = new CreateNotificationUseCase(mockRepository, mockEventService);
  });

  it('should create a notification', async () => {
    const dto: CreateNotificationDTO = {
      userId: 'user-123',
      type: 'info',
      title: 'Test',
      message: 'Test message'
    };

    const result = await useCase.execute(dto);

    expect(result).toHaveProperty('id');
    expect(result.userId).toBe(dto.userId);
    expect(mockEventService.emitToUser).toHaveBeenCalled();
  });
});
```

## Convenciones de Código

### Nomenclatura
- **Entidades**: PascalCase singular (User, Building)
- **Interfaces**: Prefijo 'I' (IUserRepository)
- **Casos de Uso**: Acción + Entidad + UseCase (CreateUserUseCase)
- **DTOs**: Entidad + DTO (UserDTO)

### Estructura de Archivos
- Un archivo por clase/interfaz
- Agrupar por funcionalidad (user/, building/)
- Tests espejo de la estructura de src/

### Imports
```typescript
// 1. Librerías externas
import { v4 as uuidv4 } from 'uuid';

// 2. Imports del dominio
import { User } from '../../../domain/entities/User';

// 3. Imports de aplicación
import { UserDTO } from '../../dtos/UserDTO';

// 4. Imports de infraestructura
import { DatabaseConnection } from '../../../infrastructure/database';
```

## Migrando Código Legacy

### Antes (MVC)
```javascript
// controllers/user.controller.js
const createUser = async (req, res) => {
  const user = await User.create({
    email: req.body.email,
    password: bcrypt.hashSync(req.body.password, 10)
  });
  
  res.json(user);
};
```

### Después (Clean Architecture)
```typescript
// Caso de uso
export class CreateUserUseCase {
  async execute(data: CreateUserDTO): Promise<UserDTO> {
    const hashedPassword = await this.authService.hashPassword(data.password);
    const user = new User(
      uuidv4(),
      data.email,
      hashedPassword,
      // ...
    );
    
    const saved = await this.userRepository.create(user);
    return UserMapper.toDTO(saved);
  }
}

// Controlador
const createUser = async (req, res) => {
  const useCase = req.container.createUserUseCase;
  const user = await useCase.execute(req.body);
  res.json(user);
};
```

## Troubleshooting

### Error: "Cannot find module"
- Verificar rutas de importación
- Asegurar que el archivo existe
- Revisar exports en index.ts/js

### Error: "Repository method not implemented"
- Verificar que todos los métodos de la interfaz estén implementados
- Revisar tipos de retorno

### Tests fallando
- Verificar que los mocks implementen toda la interfaz
- Resetear mocks entre tests
- Verificar asincronía con async/await

## Recursos Adicionales

- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [Dependency Injection](https://martinfowler.com/articles/injection.html)