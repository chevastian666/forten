# FORTEN CRM - Panel de Control Operativo

Sistema integral de portería digital y monitoreo 24h para edificios residenciales en Uruguay.

## 🚀 Características Principales

### 📊 Dashboard Principal
- **Métricas en tiempo real**: Edificios activos, residentes, cámaras online, eventos del día
- **Vista de cámaras en vivo**: Grid de cámaras con streaming en tiempo real
- **Actividad de accesos**: Registro en tiempo real de entradas/salidas
- **Alertas y notificaciones**: Sistema de alertas críticas y eventos importantes
- **Estado del edificio**: Resumen de ocupación, mantenimiento y servicios
- **Acciones rápidas**: Generación de PINs, autorizaciones y controles

### 🏢 Gestión de Edificios
- Lista completa de edificios administrados
- Información detallada: unidades, ocupación, cámaras, estado
- Filtros por estado (activo, inactivo, mantenimiento)
- Búsqueda avanzada y ordenamiento
- Vista de cards con métricas visuales
- Gestión de unidades y amenities
- Configuración de servicios por edificio

### 👥 Gestión de Residentes
- Base de datos completa de residentes
- Información de contacto y unidades asociadas
- Estado de accesos y autorizaciones
- Sistema de búsqueda y filtrado
- Generación de credenciales de acceso
- Historial de accesos por residente
- Gestión de vehículos asociados

### 🔐 Control de Accesos
- Registro en tiempo real de todos los accesos
- Tipos: residentes, visitantes, delivery, personal
- Métodos: PIN, tarjeta, app móvil, QR, manual
- Estados: permitido, denegado, expirado, pendiente
- Historial completo con timestamps
- Generación de PINs temporales
- Control de visitantes recurrentes

### 📹 Sistema de Cámaras con HikCentral
- **Integración completa con HikCentral**:
  - Autenticación HMAC-SHA256
  - Streaming en vivo HLS
  - Control PTZ de cámaras
  - Eventos en tiempo real vía WebSocket
- Vista en grid de todas las cámaras
- Streaming en vivo con controles de reproducción
- Vista detallada con especificaciones técnicas
- Modo pantalla completa para monitoreo
- Indicadores de estado y grabación
- Captura de snapshots
- Grabación y reproducción de eventos

### 🔔 Sistema de Eventos
- Monitoreo 24/7 de eventos de seguridad
- Clasificación por tipo y severidad
- Estados: activo, resuelto, reconocido, investigando
- Filtros avanzados por período, tipo, severidad y edificio
- Integración con sistema de cámaras
- Notificaciones automáticas
- Escalamiento de alertas

### 📱 Integración Q-Box
- **Control de dispositivos Q-Box**:
  - Comunicación MQTT en tiempo real
  - Gestión de dispositivos de acceso
  - Sistema de PINs dinámicos
  - Control de puertas y barreras
  - Monitoreo de estado de dispositivos
  - Sincronización de usuarios
  - Logs de acceso en tiempo real

### 💬 WhatsApp Business API
- **Comunicación automatizada**:
  - Notificaciones de acceso
  - Alertas de visitantes
  - Avisos de entregas
  - Comunicados del edificio
  - Recordatorios de pago
  - Alertas de emergencia
- **Conversaciones bidireccionales**:
  - Chat en tiempo real con residentes
  - Gestión de conversaciones
  - Etiquetado y categorización
  - Archivado de conversaciones
  - Búsqueda de mensajes

### 📈 Analytics y Reportes
- **Dashboard de Analytics**:
  - Métricas en tiempo real
  - KPIs operacionales
  - Análisis de accesos
  - Métricas de seguridad
  - Indicadores financieros
  - Satisfacción de residentes
- **Generación de Reportes**:
  - Exportación en PDF, Excel, CSV, JSON
  - Reportes programados
  - Plantillas personalizables
  - Distribución por email
  - Histórico de reportes
- **Sistema de Alertas**:
  - Alertas basadas en métricas
  - Condiciones configurables
  - Notificaciones multicanal
  - Escalamiento automático

### ⚙️ Configuración del Sistema
- **General**: Información de empresa, zona horaria, idioma
- **Seguridad**: 2FA, gestión de PINs, control de sesiones
- **Cámaras**: Calidad de grabación, retención, almacenamiento
- **Notificaciones**: Alertas email, configuración SMTP
- **Integraciones**: WhatsApp Business, HikCentral, Q-Box
- **Sistema**: Base de datos, backups, mantenimiento

## 🛠️ Stack Tecnológico

### Frontend
- **Framework**: Next.js 14 con App Router y Turbopack
- **UI Library**: ShadCN/UI (Radix UI + Tailwind CSS)
- **Styling**: Tailwind CSS
- **State Management**: React Context + React Query (TanStack Query)
- **Internacionalización**: next-intl (ES/EN)
- **Icons**: Lucide React
- **Charts**: Chart.js + react-chartjs-2
- **Animaciones**: Framer Motion
- **Reportes**: jsPDF + xlsx
- **Comunicación tiempo real**: WebSocket
- **Validación**: Zod

### Características Técnicas
- **Progressive Web App (PWA)**: Instalable con funcionamiento offline
- **Server Components**: Renderizado optimizado del lado del servidor
- **Dynamic Imports**: Lazy loading para optimización de performance
- **Route Preloading**: Precarga inteligente de rutas
- **Responsive Design**: Adaptado para desktop y dispositivos móviles
- **Dark Mode**: Soporte completo para modo oscuro
- **TypeScript**: Type safety en todo el proyecto

### Optimizaciones
- Code splitting automático por ruta
- Componente de video optimizado para streaming
- Virtual scrolling para listas grandes
- Debounce/throttle en operaciones costosas
- Caché inteligente con service workers
- Lazy loading de imágenes y componentes
- Compresión de assets

## 📦 Instalación

```bash
# Clonar el repositorio
git clone https://github.com/chevastian666/forten.git
cd forten/forten-crm/frontend-next

# Instalar dependencias
npm install

# Variables de entorno (crear archivo .env.local)
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:8000/ws
NEXT_PUBLIC_HIKVISION_BASE_URL=https://hikvision-api.example.com
NEXT_PUBLIC_QBOX_MQTT_URL=mqtt://qbox.example.com:1883
NEXT_PUBLIC_WHATSAPP_API_URL=https://api.whatsapp.com
```

## 🚀 Desarrollo

```bash
# Servidor de desarrollo
npm run dev

# El panel estará disponible en:
# http://localhost:3000
```

## 🔨 Comandos Disponibles

```bash
# Desarrollo
npm run dev          # Inicia servidor de desarrollo con Turbopack

# Producción
npm run build        # Construye la aplicación para producción
npm run start        # Inicia servidor de producción

# Calidad de código
npm run lint         # Ejecuta ESLint
npm run type-check   # Verifica tipos de TypeScript

# Testing (pendiente)
npm run test         # Ejecuta tests unitarios
npm run test:e2e     # Ejecuta tests E2E

# Otros
npm run analyze      # Analiza el bundle size
```

## 📱 Progressive Web App

La aplicación está configurada como PWA con:
- Instalación en dispositivos
- Funcionamiento offline
- Actualizaciones automáticas
- Push notifications
- Sincronización en background
- Caché inteligente de recursos

## 🌐 Internacionalización

Soporta múltiples idiomas:
- Español (es) - Por defecto
- Inglés (en)

Cambio de idioma disponible en la configuración del sistema.

## 🔐 Seguridad

- Autenticación JWT con refresh tokens
- Protección CSRF
- Rate limiting
- Sanitización de inputs
- Headers de seguridad configurados
- Encriptación de datos sensibles
- Auditoría de acciones

## 📊 Características Avanzadas

### Monitoreo en Tiempo Real
- WebSocket para actualizaciones en vivo
- Sistema de notificaciones push
- Alertas críticas instantáneas
- Métricas actualizadas cada 30 segundos

### Integraciones Implementadas
- **HikCentral**: Sistema completo de cámaras Hikvision
- **WhatsApp Business API**: Notificaciones y chat bidireccional
- **Q-Box**: Control de accesos y dispositivos IoT
- **Analytics**: Sistema completo de métricas y reportes

### Gestión de Datos
- Búsqueda y filtrado avanzado
- Exportación de datos (CSV, PDF, Excel, JSON)
- Historial completo de actividades
- Sistema de respaldos automáticos
- Retención configurable de datos

## 🏗️ Arquitectura

```
frontend-next/
├── src/
│   ├── app/
│   │   ├── [locale]/         # Rutas con soporte i18n
│   │   │   ├── dashboard/    # Panel principal
│   │   │   ├── buildings/    # Gestión de edificios
│   │   │   ├── residents/    # Gestión de residentes
│   │   │   ├── access/       # Control de accesos
│   │   │   ├── cameras/      # Sistema de cámaras
│   │   │   ├── events/       # Eventos de seguridad
│   │   │   ├── whatsapp/     # WhatsApp Business
│   │   │   ├── analytics/    # Analytics y métricas
│   │   │   ├── reports/      # Gestión de reportes
│   │   │   └── settings/     # Configuración
│   │   └── api/              # API routes
│   ├── components/
│   │   ├── ui/               # Componentes ShadCN/UI
│   │   ├── layout/           # Layout components
│   │   ├── analytics/        # Componentes de analytics
│   │   ├── whatsapp/         # Componentes de WhatsApp
│   │   └── design-system/    # Sistema de diseño personalizado
│   ├── services/             # Servicios y lógica de negocio
│   │   ├── hikvision/        # Integración HikCentral
│   │   ├── qbox/             # Integración Q-Box
│   │   ├── whatsapp/         # Integración WhatsApp
│   │   └── analytics/        # Servicios de analytics
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utilidades y configuraciones
│   ├── utils/                # Funciones de utilidad
│   └── i18n/                 # Configuración i18n
├── messages/                 # Archivos de traducción
├── public/                   # Assets estáticos
└── ...configuración
```

## 📋 Tareas Pendientes

### Backend API
- [ ] Implementar API REST completa
- [ ] Sistema de autenticación JWT
- [ ] WebSocket server para tiempo real
- [ ] Integración con base de datos
- [ ] Sistema de permisos y roles
- [ ] API Gateway para microservicios

### Testing
- [ ] Tests unitarios con Jest
- [ ] Tests de integración
- [ ] Tests E2E con Playwright
- [ ] Tests de performance
- [ ] Cobertura mínima del 80%

### DevOps
- [ ] Pipeline CI/CD
- [ ] Containerización con Docker
- [ ] Orquestación con Kubernetes
- [ ] Monitoreo con Prometheus/Grafana
- [ ] Logs centralizados
- [ ] Backups automatizados

### Funcionalidades Adicionales
- [ ] App móvil para residentes
- [ ] Sistema de facturación
- [ ] Gestión de proveedores
- [ ] Inventario y activos
- [ ] Encuestas de satisfacción
- [ ] Portal web para residentes
- [ ] Integración con sistemas contables
- [ ] API pública para terceros

### Optimizaciones
- [ ] Implementar Redis para caché
- [ ] CDN para assets estáticos
- [ ] Optimización de imágenes
- [ ] Compresión Brotli
- [ ] Service Workers mejorados
- [ ] IndexedDB para offline

### Seguridad
- [ ] Auditoría de seguridad completa
- [ ] Penetration testing
- [ ] Certificación PCI DSS
- [ ] Cumplimiento GDPR
- [ ] Encriptación end-to-end
- [ ] Multi-factor authentication

## 🤝 Contribución

1. Fork el proyecto
2. Crea tu rama de feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Propiedad de FORTEN Security Systems - Todos los derechos reservados.

## 📞 Contacto

FORTEN Security Systems - [info@forten.com.uy](mailto:info@forten.com.uy)

Proyecto Link: [https://github.com/chevastian666/forten](https://github.com/chevastian666/forten)

---

Desarrollado con ❤️ por FORTEN Security Systems para la seguridad de edificios residenciales en Uruguay.