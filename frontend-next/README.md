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

### 👥 Gestión de Residentes
- Base de datos completa de residentes
- Información de contacto y unidades asociadas
- Estado de accesos y autorizaciones
- Sistema de búsqueda y filtrado
- Generación de credenciales de acceso

### 🔐 Control de Accesos
- Registro en tiempo real de todos los accesos
- Tipos: residentes, visitantes, delivery, personal
- Métodos: PIN, tarjeta, app móvil, QR, manual
- Estados: permitido, denegado, expirado, pendiente
- Historial completo con timestamps

### 📹 Sistema de Cámaras
- Vista en grid de todas las cámaras
- Streaming en vivo con controles de reproducción
- Vista detallada con especificaciones técnicas
- Modo pantalla completa para monitoreo
- Indicadores de estado y grabación
- Captura de snapshots

### 🔔 Sistema de Eventos
- Monitoreo 24/7 de eventos de seguridad
- Clasificación por tipo y severidad
- Estados: activo, resuelto, reconocido, investigando
- Filtros avanzados por período, tipo, severidad y edificio
- Integración con sistema de cámaras

### ⚙️ Configuración del Sistema
- **General**: Información de empresa, zona horaria, idioma
- **Seguridad**: 2FA, gestión de PINs, control de sesiones
- **Cámaras**: Calidad de grabación, retención, almacenamiento
- **Notificaciones**: Alertas email, configuración SMTP
- **Integraciones**: WhatsApp Business, HikCentral
- **Sistema**: Base de datos, backups, mantenimiento

## 🛠️ Stack Tecnológico

### Frontend
- **Framework**: Next.js 14 con App Router
- **UI Library**: ShadCN/UI (Radix UI + Tailwind CSS)
- **Styling**: Tailwind CSS
- **State Management**: React Context + React Query
- **Internacionalización**: next-intl (ES/EN)
- **Icons**: Lucide React

### Características Técnicas
- **Progressive Web App (PWA)**: Instalable con funcionamiento offline
- **Server Components**: Renderizado optimizado del lado del servidor
- **Dynamic Imports**: Lazy loading para optimización de performance
- **Route Preloading**: Precarga inteligente de rutas
- **Responsive Design**: Adaptado para desktop y dispositivos móviles

### Optimizaciones
- Code splitting automático por ruta
- Componente de video optimizado para streaming
- Virtual scrolling para listas grandes
- Debounce/throttle en operaciones costosas
- Caché inteligente con service workers

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
```

## 🚀 Desarrollo

```bash
# Servidor de desarrollo
npm run dev

# El panel estará disponible en:
# http://localhost:3005 (puerto personalizado para FORTEN)
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

## 📊 Características Avanzadas

### Monitoreo en Tiempo Real
- WebSocket para actualizaciones en vivo
- Sistema de notificaciones push
- Alertas críticas instantáneas

### Integraciones
- **HikCentral**: Sistema de cámaras Hikvision
- **WhatsApp Business**: Notificaciones y comunicación
- **Analytics**: Sistema de métricas y reportes

### Gestión de Datos
- Búsqueda y filtrado avanzado
- Exportación de datos (CSV, PDF)
- Historial completo de actividades
- Sistema de respaldos automáticos

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
│   │   │   └── settings/     # Configuración
│   │   └── api/              # API routes
│   ├── components/
│   │   ├── ui/               # Componentes ShadCN/UI
│   │   ├── layout/           # Layout components
│   │   └── design-system/    # Sistema de diseño personalizado
│   ├── contexts/             # React Context providers
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utilidades y configuraciones
│   ├── utils/                # Funciones de utilidad
│   └── i18n/                 # Configuración i18n
├── messages/                 # Archivos de traducción
├── public/                   # Assets estáticos
└── ...configuración
```

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