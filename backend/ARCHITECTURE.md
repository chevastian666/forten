# FORTEN Backend - Clean Architecture

## Resumen

El backend de FORTEN ha sido refactorizado siguiendo los principios de Clean Architecture, proporcionando una clara separación de responsabilidades y haciendo el código más mantenible, testeable y escalable.

## Estructura de Directorios

```
src/
├── domain/              # Capa de Dominio - Lógica de negocio pura
│   ├── entities/       # Entidades del dominio
│   ├── repositories/   # Interfaces de repositorios
│   └── services/       # Interfaces de servicios del dominio
├── application/        # Capa de Aplicación - Casos de uso
│   ├── use-cases/     # Implementación de casos de uso
│   ├── dtos/          # Data Transfer Objects
│   └── mappers/       # Mappers entre entidades y DTOs
├── infrastructure/     # Capa de Infraestructura - Implementaciones
│   ├── repositories/  # Implementaciones de repositorios (Sequelize)
│   ├── services/      # Implementaciones de servicios externos
│   ├── container/     # Contenedor de inyección de dependencias
│   └── initialization/# Inicialización de infraestructura
├── presentation/       # Capa de Presentación - Controladores
│   └── controllers/   # Controladores HTTP
├── routes/            # Definición de rutas Express
├── models/            # Modelos Sequelize (legacy)
├── middleware/        # Middlewares Express
└── config/           # Configuración de la aplicación
```

## Capas de la Arquitectura

### 1. Capa de Dominio (`domain/`)

Contiene la lógica de negocio pura, independiente de cualquier framework o librería externa.

**Entidades:**
- `User`: Gestión de usuarios y autenticación
- `Building`: Edificios y sus propiedades
- `Event`: Eventos del sistema y alarmas
- `Access`: Control de acceso con PINs

**Interfaces de Repositorios:**
- `IUserRepository`
- `IBuildingRepository`
- `IEventRepository`
- `IAccessRepository`

**Interfaces de Servicios:**
- `IAuthService`: Autenticación y JWT
- `IEventService`: Publicación de eventos en tiempo real

### 2. Capa de Aplicación (`application/`)

Orquesta el flujo de datos y coordina las entidades del dominio.

**Casos de Uso Principales:**
- **Auth**: `LoginUseCase`, `RefreshTokenUseCase`
- **Buildings**: `CreateBuildingUseCase`, `UpdateBuildingUseCase`, `GetBuildingByIdUseCase`
- **Events**: `CreateEventUseCase`, `GetEventsUseCase`, `ResolveEventUseCase`
- **Access**: `CreateAccessUseCase`, `ValidateAccessUseCase`, `GenerateAccessReportUseCase`

**DTOs y Mappers:**
- DTOs definen la estructura de datos para la API
- Mappers convierten entre entidades del dominio y DTOs

### 3. Capa de Infraestructura (`infrastructure/`)

Implementaciones concretas de las interfaces del dominio.

**Repositorios Sequelize:**
- Implementan las interfaces del dominio usando Sequelize ORM
- Manejan la persistencia en SQLite/PostgreSQL

**Servicios:**
- `JwtAuthService`: Implementación con jsonwebtoken
- `SocketEventService`: Implementación con Socket.io

**Container:**
- Gestiona la inyección de dependencias
- Instancia y conecta todas las capas

### 4. Capa de Presentación (`presentation/`)

Maneja las peticiones HTTP y las respuestas.

**Controladores:**
- Reciben peticiones HTTP
- Validan entrada
- Llaman a casos de uso
- Formatean respuestas

## Flujo de Datos

1. **Request** → Route → Controller
2. **Controller** → Use Case (con DTOs)
3. **Use Case** → Repository/Service (con Entities)
4. **Repository** → Database
5. **Response** ← Controller ← Use Case (con DTOs)

## Beneficios de la Arquitectura

### 1. Testabilidad
- Cada capa puede ser testeada independientemente
- Los casos de uso tienen tests unitarios con 100% de cobertura
- Fácil mockeo de dependencias

### 2. Mantenibilidad
- Cambios en la base de datos no afectan la lógica de negocio
- Cambios en la UI no afectan los casos de uso
- Clara separación de responsabilidades

### 3. Escalabilidad
- Fácil agregar nuevos casos de uso
- Posible cambiar de framework web sin afectar el dominio
- Posible cambiar de base de datos sin afectar la lógica

### 4. Independencia de Frameworks
- El dominio no depende de Express, Sequelize, o Socket.io
- Facilita la migración a otras tecnologías

## Patrones Implementados

- **Repository Pattern**: Abstracción del acceso a datos
- **Use Case Pattern**: Encapsulación de la lógica de negocio
- **DTO Pattern**: Separación de datos internos y externos
- **Dependency Injection**: Inversión de control
- **Mapper Pattern**: Conversión entre capas

## Migración desde MVC

El proyecto originalmente seguía un patrón MVC tradicional. La migración a Clean Architecture se realizó:

1. Extrayendo lógica de negocio de los controladores a casos de uso
2. Creando interfaces para abstraer dependencias externas
3. Implementando DTOs para la comunicación entre capas
4. Manteniendo compatibilidad con el código existente

## Testing

```bash
# Ejecutar tests unitarios
npm test

# Tests con cobertura
npm run test:coverage

# Tests en modo watch
npm run test:watch
```

Los tests cubren:
- Lógica de negocio en casos de uso
- Manejo de errores
- Casos extremos
- Integración entre capas

## Próximos Pasos

1. Completar migración de todos los endpoints a Clean Architecture
2. Agregar tests de integración
3. Implementar caché con Redis
4. Agregar documentación OpenAPI/Swagger
5. Implementar logging estructurado