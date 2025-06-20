# FORTEN Backend - Sistema de Auditoría

Sistema completo de auditoría para el backend de FORTEN CRM que registra todas las acciones críticas del sistema.

## 🔍 Características del Sistema de Auditoría

### Funcionalidades Implementadas

- **Registro automático de acciones críticas** (CREATE, UPDATE, DELETE)
- **Comparación de cambios** en operaciones PUT/PATCH
- **Captura de información del usuario**, IP, User-Agent
- **Masking de datos sensibles** (passwords, tokens, PINs)
- **Filtrado y búsqueda avanzada** de logs de auditoría
- **Exportación de logs** en formato CSV y JSON
- **API REST completa** para consulta de auditoría
- **Estadísticas de auditoría** y análisis de uso
- **Retención configurable** de logs antiguos

### Middleware de Auditoría

El middleware captura automáticamente:
- Método HTTP y path de la request
- Usuario que ejecuta la acción
- IP address y User-Agent
- Body de requests POST/PUT/PATCH
- Cambios detectados (before/after)
- Duración de la request
- Estado de success/failure
- Metadatos adicionales

## 📁 Estructura del Proyecto

```
backend/
├── src/
│   ├── middleware/
│   │   └── audit.middleware.js      # Middleware principal de auditoría
│   ├── models/
│   │   ├── AuditLog.js             # Modelo Sequelize para logs
│   │   ├── User.js                 # Modelo de usuario
│   │   └── index.js                # Configuración de modelos
│   ├── services/
│   │   └── audit.service.js        # Lógica de negocio de auditoría
│   ├── controllers/
│   │   └── audit.controller.js     # Controlador REST para auditoría
│   ├── routes/
│   │   └── audit.routes.js         # Rutas de API de auditoría
│   ├── migrations/
│   │   ├── 001-create-users.js     # Migración tabla usuarios
│   │   └── 002-create-audit-logs.js # Migración tabla audit_logs
│   ├── config/
│   │   ├── database.js             # Configuración Sequelize
│   │   └── database.config.js      # Config por ambiente
│   └── server.js                   # Servidor principal
├── .env.example                    # Variables de entorno
└── package.json                    # Dependencias del proyecto
```

## 🚀 Instalación y Configuración

### 1. Instalar Dependencias

```bash
cd backend
npm install
```

### 2. Configurar Base de Datos

Crear archivo `.env` basado en `.env.example`:

```bash
cp .env.example .env
```

Configurar PostgreSQL en `.env`:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=forten_crm_dev
DB_USER=postgres
DB_PASSWORD=postgres

# Audit Configuration
AUDIT_RETENTION_DAYS=90
AUDIT_MASK_SENSITIVE=true
```

### 3. Crear Base de Datos

```sql
-- Conectar a PostgreSQL y crear la base de datos
CREATE DATABASE forten_crm_dev;
CREATE DATABASE forten_crm_test;
```

### 4. Ejecutar Migraciones

```bash
# Instalar Sequelize CLI globalmente
npm install -g sequelize-cli

# Ejecutar migraciones
npx sequelize-cli db:migrate
```

### 5. Iniciar Servidor

```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## 📊 Base de Datos - Tabla audit_logs

### Estructura de la Tabla

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  entity VARCHAR(50) NOT NULL,
  entity_id VARCHAR,
  changes JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  request_id UUID,
  session_id VARCHAR,
  status VARCHAR(10) DEFAULT 'SUCCESS',
  error_message TEXT,
  duration_ms INTEGER,
  method VARCHAR(10),
  path VARCHAR,
  query_params JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Índices para Performance

```sql
-- Índices principales
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_ip_address ON audit_logs(ip_address);
CREATE INDEX idx_audit_logs_status ON audit_logs(status);

-- Índice compuesto para consultas complejas
CREATE INDEX idx_audit_logs_entity_action_created 
ON audit_logs(entity, action, created_at);
```

## 🔧 Uso del Sistema de Auditoría

### 1. Middleware Automático

El middleware se aplica automáticamente a todas las rutas:

```javascript
// En server.js
app.use(auditMiddleware({
  excludePaths: ['/health', '/metrics'],
  includeMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  captureChanges: true,
  maskSensitive: true,
  sensitiveFields: ['password', 'token', 'secret', 'pin']
}));
```

### 2. Logging Manual

```javascript
const AuditService = require('./services/audit.service');

// Log de acción exitosa
await AuditService.logSuccess({
  userId: req.user.id,
  action: 'USER_LOGIN',
  entity: 'USER',
  entityId: user.id,
  metadata: { loginMethod: 'email' },
  request: req
});

// Log de acción fallida
await AuditService.logFailure({
  userId: req.user?.id,
  action: 'USER_LOGIN',
  entity: 'USER',
  error: 'Invalid credentials',
  request: req
});
```

### 3. Auditoría de Acciones Críticas

```javascript
const { auditCritical } = require('./middleware/audit.middleware');

// Aplicar a rutas específicas
router.delete('/users/:id', 
  auditCritical('USER_DELETE'),
  userController.deleteUser
);
```

## 📈 API de Consulta de Auditoría

### Endpoints Disponibles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/audit-logs` | Obtener logs con filtros |
| GET | `/api/audit-logs/stats` | Estadísticas de auditoría |
| GET | `/api/audit-logs/critical` | Acciones críticas |
| GET | `/api/audit-logs/entity/:entity/:id` | Logs de entidad específica |
| GET | `/api/audit-logs/user/:userId` | Actividad de usuario |
| POST | `/api/audit-logs/export` | Exportar logs |

### Ejemplos de Uso

#### Obtener Logs con Filtros

```bash
GET /api/audit-logs?page=1&limit=50&action=CREATE&entity=USER&startDate=2024-01-01
```

#### Estadísticas de Auditoría

```bash
GET /api/audit-logs/stats?startDate=2024-01-01&endDate=2024-01-31
```

Respuesta:
```json
{
  "success": true,
  "data": {
    "summary": {
      "total": 1500,
      "success": 1450,
      "failed": 50,
      "failure_rate": "3.33"
    },
    "by_action": [
      {"action": "CREATE", "count": 800},
      {"action": "UPDATE", "count": 500},
      {"action": "DELETE", "count": 200}
    ],
    "by_entity": [
      {"entity": "USER", "count": 600},
      {"entity": "BUILDING", "count": 400}
    ]
  }
}
```

#### Exportar Logs

```bash
POST /api/audit-logs/export
Content-Type: application/json

{
  "format": "csv",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "action": "DELETE"
}
```

## 🔒 Seguridad y Privacidad

### Masking de Datos Sensibles

El sistema automáticamente enmascara campos sensibles:

```javascript
// Campos sensibles por defecto
const sensitiveFields = [
  'password', 'token', 'secret', 'pin', 
  'credit_card', 'cvv', 'ssn'
];

// Los valores se reemplazan por '***MASKED***'
```

### Control de Acceso

- **Administradores**: Acceso completo a todos los logs
- **Usuarios**: Solo pueden ver sus propios logs
- **Endpoints críticos**: Requieren rol de administrador

### Retención de Datos

```javascript
// Limpiar logs antiguos (configuración automática)
await AuditService.cleanOldLogs(90); // 90 días
```

## 📊 Monitoreo y Alertas

### Métricas Clave

- Total de acciones auditadas
- Tasa de fallos
- Acciones por usuario
- Acciones por entidad
- Distribución temporal

### Alertas Recomendadas

- Alto número de fallos de autenticación
- Acciones críticas fuera de horario
- Intentos de acceso desde IPs sospechosas
- Volumen inusual de operaciones DELETE

## 🧪 Testing

### Endpoints de Demostración

El servidor incluye endpoints de demo para probar la auditoría:

```bash
# Crear usuario (auditado)
POST /api/demo/users
{
  "email": "test@example.com",
  "firstName": "Test",
  "lastName": "User"
}

# Actualizar usuario (auditado con comparación de cambios)
PUT /api/demo/users/123
{
  "firstName": "Updated Name"
}

# Eliminar usuario (auditado)
DELETE /api/demo/users/123
```

### Verificar Logs

```bash
# Ver logs generados
GET /api/audit-logs?limit=10&entity=DEMO

# Ver estadísticas
GET /api/audit-logs/stats
```

## 🔧 Configuración Avanzada

### Variables de Entorno

```env
# Retención de logs (días)
AUDIT_RETENTION_DAYS=90

# Nivel de logging
AUDIT_LOG_LEVEL=info

# Masking de datos sensibles
AUDIT_MASK_SENSITIVE=true
```

### Personalización del Middleware

```javascript
app.use(auditMiddleware({
  // Excluir rutas específicas
  excludePaths: ['/health', '/metrics', '/static'],
  
  // Métodos HTTP a auditar
  includeMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  
  // Capturar cambios en PUT/PATCH
  captureChanges: true,
  
  // Enmascarar datos sensibles
  maskSensitive: true,
  
  // Campos sensibles personalizados
  sensitiveFields: ['password', 'ssn', 'card_number']
}));
```

## 🚀 Próximas Funcionalidades

- [ ] Dashboard web de auditoría
- [ ] Alertas en tiempo real
- [ ] Integración con sistemas de monitoreo
- [ ] Firma digital de logs
- [ ] Compliance automático (SOX, GDPR)
- [ ] Machine learning para detección de anomalías

## 📞 Soporte

Para soporte técnico del sistema de auditoría:

- **Email**: dev@forten.com.uy
- **Documentación**: [Wiki interno]
- **Issues**: [GitHub Issues]

---

Desarrollado con 🔍 por el equipo de FORTEN Security Systems