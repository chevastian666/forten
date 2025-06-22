# Centro de Comando - Wall de Monitores Virtuales

## 🖥️ Características Principales

### ✨ Wall de 9 Monitores Virtuales
- **Grid CSS responsivo** con 9 monitores simulados
- **Efectos CRT auténticos** con scanlines para realismo
- **Estado en tiempo real** de cada monitor (online/warning/offline)
- **Maximización individual** de cualquier monitor

### 📺 Tipos de Monitores

1. **🎥 Cámaras Simuladas (4 monitores)**
   - Feed de video simulado con objetos en movimiento
   - Overlay de información (ID cámara, timestamp, estado)
   - Indicador de grabación pulsante
   - Grid de referencia tipo cámara de seguridad
   - Simulación de desconexiones (90% uptime)

2. **📊 Gráficos en Tiempo Real (2 monitores)**
   - Gráfico de área para actividad general
   - Gráfico de barras para conectividad de red
   - Actualización automática cada 3 segundos
   - Estilo terminal con colores verdes fosforescentes

3. **🚨 Feed de Alertas Scrolling (1 monitor)**
   - Scroll vertical continuo de alertas
   - Colores por prioridad (crítico=rojo, alto=naranja, etc.)
   - Nuevas alertas cada 5 segundos
   - Timestamp y categorización automática

4. **🔥 Mapa de Calor de Actividad (1 monitor)**
   - Grid 10x10 con intensidad variable
   - Actualización cada 4 segundos
   - Visualización de patrones de actividad
   - Efecto de transición suave

5. **⚙️ Estado del Sistema (1 monitor)**
   - Métricas de CPU, memoria, red y almacenamiento
   - Barras de progreso con colores de alerta
   - Actualización cada 3 segundos
   - Monitoreo en tiempo real

### 🎨 Efectos Visuales

#### **Efectos Visuales Profesionales**
- Sombras sutiles y bordes redondeados
- Transiciones suaves entre estados
- Iconografía Material Design consistente

#### **Diseño Empresarial Profesional**
- Color principal: Naranja corporativo (#FF6B35)
- Fuente Roboto para profesionalismo
- Fondo claro (#F8F9FA) con acentos negros
- Estilo consistente con el resto de la aplicación

#### **Animaciones Fluidas**
- Transiciones suaves al maximizar monitores
- Objetos en movimiento en cámaras simuladas
- Indicadores pulsantes para estado online
- Scroll continuo y suave en alertas

### 🔊 Sonido Ambiente

- **Control de audio** integrado con botón mute/unmute
- **Sonidos de centro de control** (cuando esté disponible)
- **Indicador visual** del estado del audio

### 🎛️ Controles Interactivos

#### **Maximización de Monitores**
- Click en icono de fullscreen para maximizar
- Vista individual ocupando toda la pantalla
- Botón para volver al grid completo
- Animaciones layout fluidas

#### **Estados Dinámicos**
- Monitores online (verde), warning (amarillo), offline (rojo)
- Indicadores de estado en tiempo real
- Simulación de desconexiones ocasionales

## 🎯 Cómo Acceder

### **Desde la Aplicación**
1. **Login:** admin@forten.com / admin123
2. **Menú lateral:** Click en "Centro de Comando" (solo admin/manager)
3. **URL directa:** http://localhost:3006/command-center

### **Controles Disponibles**
- **🔊 Control de audio:** Activar/desactivar sonidos ambiente
- **↗️ Maximizar:** Click en cualquier monitor para ampliar
- **🔍 Monitoreo:** Observar métricas en tiempo real

## 🛠️ Implementación Técnica

### **Tecnologías Utilizadas**
- **CSS Grid:** Layout responsive del wall de monitores
- **Framer Motion:** Animaciones suaves y transiciones
- **Recharts:** Gráficos en tiempo real
- **Material-UI:** Componentes base y iconografía
- **TypeScript:** Tipado fuerte y desarrollo robusto

### **Arquitectura de Componentes**
```
CommandCenter/
├── CommandCenter.tsx     # Componente principal
├── index.ts             # Exportaciones
└── README.md           # Documentación

Subcomponentes:
├── CameraFeed          # Simulación de cámaras
├── RealtimeChart       # Gráficos en tiempo real
├── ScrollingAlerts     # Feed de alertas
├── ActivityHeatmap     # Mapa de calor
├── SystemStats         # Estado del sistema
└── CRTScanlines       # Efectos CRT
```

### **Datos Simulados**
- **Generación procedural** de datos en tiempo real
- **Patrones realistas** basados en uso típico
- **Variaciones aleatorias** para autenticidad
- **Ciclos de actualización** optimizados

## 🎪 Casos de Uso

### **Presentaciones Ejecutivas**
- Demostración de capacidades de monitoreo
- Impacto visual para stakeholders
- Simulación de centro de control real

### **Entrenamiento de Operadores**
- Familiarización con interfaces de seguridad
- Práctica en identificación de alertas
- Comprensión de flujos de información

### **Demos Comerciales**
- Showcasing de tecnología FORTEN
- Diferenciación competitiva
- Experiencia inmersiva para clientes

## 💡 Características Destacadas

- **100% Responsive:** Adaptable a cualquier tamaño de pantalla
- **Tiempo Real:** Todas las métricas se actualizan automáticamente
- **Realismo Visual:** Efectos CRT y estética de centro de control
- **Interactividad Completa:** Maximización, controles de audio
- **Performance Optimizada:** Animaciones suaves sin lag
- **Accesibilidad:** Controles intuitivos y navegación clara