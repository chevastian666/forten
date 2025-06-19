# FORTEN CRM - Sistema de Portería Digital

Sistema integral de portería digital y monitoreo 24h para edificios residenciales.

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js >= 16.0.0
- PostgreSQL
- Redis

### Instalación

1. **Clonar el repositorio**
```bash
git clone [repository-url]
cd forten-crm
```

2. **Configurar Backend**
```bash
cd backend
cp .env.example .env
# Editar .env con tus configuraciones
npm install
npm run seed # Crear datos iniciales
npm run dev
```

3. **Configurar Frontend**
```bash
cd ../frontend
cp .env.example .env
npm install
npm start
```

### Credenciales de Prueba

- **Admin**: admin@forten.com / admin123
- **Operator**: operator@forten.com / operator123
- **Supervisor**: supervisor@forten.com / supervisor123

## 📋 Características

### Panel de Control (CRM)
- ✅ Gestión de edificios
- ✅ Sistema de autenticación JWT
- ✅ Dashboard con métricas en tiempo real
- ✅ Registro de eventos
- ✅ Control de accesos con generación de PINs
- ✅ Módulo de monitoreo (placeholder para HikCentral)
- ✅ WebSockets para actualizaciones en tiempo real

### Por Implementar
- [ ] Integración real con HikCentral
- [ ] Integración con Q-Box
- [ ] WhatsApp Business API
- [ ] Reportes y analytics
- [ ] Aplicación móvil para residentes

## 🛠️ Stack Tecnológico

### Backend
- Node.js + Express
- PostgreSQL + Sequelize
- Redis
- Socket.io
- JWT Authentication

### Frontend
- React + TypeScript
- Material-UI
- Redux Toolkit
- Socket.io Client

## 📁 Estructura del Proyecto

```
forten-crm/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   └── services/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── store/
│   │   └── types/
│   └── package.json
└── README.md
```

## 🔧 Configuración

### Variables de Entorno Backend

```env
NODE_ENV=development
PORT=3001
DB_HOST=localhost
DB_NAME=forten_db
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_secret
CORS_ORIGIN=http://localhost:3000
```

### Variables de Entorno Frontend

```env
REACT_APP_API_URL=http://localhost:3001/api
```

## 📝 API Endpoints

### Autenticación
- `POST /api/auth/login` - Login de usuario
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/profile` - Perfil del usuario

### Edificios
- `GET /api/buildings` - Listar edificios
- `POST /api/buildings` - Crear edificio
- `PUT /api/buildings/:id` - Actualizar edificio
- `DELETE /api/buildings/:id` - Desactivar edificio

### Eventos
- `GET /api/events` - Listar eventos
- `POST /api/events` - Crear evento
- `PUT /api/events/:id/resolve` - Resolver evento

### Control de Accesos
- `GET /api/access` - Listar accesos
- `POST /api/access` - Crear acceso (genera PIN)
- `POST /api/access/validate` - Validar PIN
- `DELETE /api/access/:id` - Desactivar acceso

## 🔒 Seguridad

- Autenticación JWT con refresh tokens
- Rate limiting
- CORS configurado
- Helmet.js para headers de seguridad
- Validación de entrada con express-validator
- Roles y permisos (admin, supervisor, operator, technician)

## 🚀 Despliegue

### Recomendaciones
- AWS o Google Cloud
- CloudFlare para CDN
- Sentry para monitoreo de errores
- Backups diarios de base de datos

## 📞 Soporte

Para soporte o consultas sobre el sistema FORTEN, contactar al equipo de desarrollo.