# FORTEN Microservices Architecture

## Resumen

FORTEN está migrando de una arquitectura monolítica a una arquitectura de microservicios para mejorar la escalabilidad, mantenibilidad y permitir el desarrollo independiente de cada dominio del sistema.

## Servicios

### 1. API Gateway
- Puerto: 3000
- Punto de entrada único para todos los clientes
- Enrutamiento inteligente
- Rate limiting
- CORS handling
- Authentication proxy

### 2. Auth Service
- Puerto: 3001
- Autenticación y autorización
- Gestión de usuarios
- JWT tokens
- Roles y permisos
- Refresh tokens

### 3. Monitoring Service
- Puerto: 3002
- Integración con HikCentral
- Gestión de cámaras
- Alertas y eventos
- Streaming de video
- Estado de dispositivos

### 4. Access Service
- Puerto: 3003
- Control de accesos
- Generación de PINs
- Integración con Q-Box
- Control de puertas
- Logs de acceso

### 5. Communication Service
- Puerto: 3004
- Integración con WhatsApp
- Notificaciones push
- Email service
- SMS service
- WebSocket events

### 6. Analytics Service
- Puerto: 3005
- Reportes y métricas
- Dashboards
- Análisis de datos
- Exportación de informes
- KPIs

## Tecnologías

- **Node.js + TypeScript**: Para todos los servicios
- **Express**: Framework web
- **PostgreSQL**: Base de datos principal
- **Redis**: Cache y pub/sub
- **RabbitMQ**: Message broker entre servicios
- **Docker**: Containerización
- **Kubernetes**: Orquestación (futuro)

## Comunicación entre Servicios

1. **Sincrónica**: HTTP/REST para consultas directas
2. **Asincrónica**: RabbitMQ para eventos y comandos
3. **Cache**: Redis para datos compartidos

## Estructura de cada servicio

```
service-name/
├── src/
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   └── presentation/
├── tests/
├── Dockerfile
├── package.json
└── tsconfig.json
```

## Desarrollo

```bash
# Iniciar todos los servicios
docker-compose up

# Iniciar un servicio específico
docker-compose up auth-service

# Ver logs
docker-compose logs -f service-name
```

## Migración del Monolito

La migración se realizará gradualmente:
1. Extraer dominio por dominio
2. Mantener compatibilidad con el frontend existente
3. Migrar datos progresivamente
4. Actualizar el frontend para usar el API Gateway