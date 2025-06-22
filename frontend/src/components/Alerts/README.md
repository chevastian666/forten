# Sistema de Alertas Inteligentes con IA Simulada

## 🤖 Características Principales

### ✨ Detección Automática con IA
- **Niveles de confianza dinámicos** (70%-99%) basados en tipo de alerta
- **Clasificación ML simulada** con algoritmos de machine learning
- **6 tipos de detección**: Persona, Vehículo, Acceso no autorizado, Comportamiento sospechoso, Objeto, Animal
- **Análisis de severidad automático** basado en confianza y tipo

### 📊 Visualización Avanzada
- **Preview de imagen simulado** con objetos en movimiento
- **Bounding boxes animados** con react-spring
- **Etiquetas de confianza** en tiempo real
- **Efectos de pulso** para destacar detecciones

### 🎯 Sistema de Clasificación ML
- **Motor de clasificación simulado** con categorías primarias y secundarias
- **Confianza del modelo** variable por tipo de detección
- **Análisis conductual** para comportamientos sospechosos
- **Reconocimiento de objetos** con múltiples categorías

## 🔄 Agrupación Inteligente de Alertas

### **Algoritmo de Agrupación:**
1. **Agrupación por ubicación** y tipo de alerta
2. **Ventana temporal** de 30 minutos
3. **Elevación de severidad** al nivel más alto del grupo
4. **Timeline consolidado** con rango de tiempo

### **Beneficios:**
- **Reduce ruido** de alertas repetitivas
- **Identifica patrones** de actividad
- **Mejora eficiencia** de respuesta
- **Vista consolidada** de incidentes relacionados

## 🎵 Sistema de Audio Inteligente

### **Sonidos por Tipo de Alerta:**
- **Persona**: 800Hz - Tono medio para presencia humana
- **Vehículo**: 600Hz - Tono bajo para vehículos
- **Acceso no autorizado**: 1000Hz - Tono alto para seguridad crítica
- **Comportamiento sospechoso**: 750Hz - Tono de alerta media
- **Objeto**: 500Hz - Tono bajo para objetos
- **Animal**: 400Hz - Tono suave para fauna

### **Características de Audio:**
- **Control de volumen** integrado
- **Síntesis de audio** con Web Audio API
- **Duración optimizada** (0.5 segundos)
- **Activación por tipo** específico

## 🎨 Animaciones React-Spring

### **Efectos Implementados:**
- **Transiciones suaves** entre vistas
- **Animaciones de entrada** con stagger
- **Bounding boxes pulsantes** en detecciones
- **Barras de progreso animadas** para confianza
- **Cards flotantes** con hover effects

### **Configuraciones de Animación:**
```typescript
// Entrada de alertas
from: { opacity: 0, transform: 'translateX(-50px)' }
enter: { opacity: 1, transform: 'translateX(0px)' }
trail: 100ms entre elementos

// Bounding boxes
config: { tension: 200, friction: 20 }
pulso: borderWidth 2px → 4px (1 segundo)
```

## 📱 Modos de Visualización

### **Vista Individual:**
- **Alertas separadas** con detalles completos
- **Expansión individual** para ver análisis ML
- **Control de sonido** por alerta
- **Preview de imagen** con bounding boxes

### **Vista Agrupada:**
- **Grupos inteligentes** por ubicación y tiempo
- **Contador de alertas** en cada grupo
- **Severidad consolidada** del grupo
- **Timeline de rango temporal**

## 🎯 Cómo Acceder

### **Desde la Aplicación:**
1. **Login:** admin@forten.com / admin123 (o manager/supervisor)
2. **Menú lateral:** Click en "Alertas IA" (icono SmartToy)
3. **URL directa:** http://localhost:3006/ai-alerts

### **Controles Disponibles:**
- **🔀 Modo Vista:** Individual vs Agrupado
- **🔊 Control Audio:** Activar/desactivar sonidos
- **📋 Filtros:** Por tipo de alerta y severidad
- **🎵 Reproducir:** Sonido específico por tipo

## 💡 Tipos de Detección IA

### **1. 👤 Detección de Personas (92% confianza base)**
- **Clasificaciones:** Peatón, Personal, Visitante, Intruso
- **Análisis:** Reconocimiento facial, patrones de movimiento
- **Severidad:** Variable según autorización

### **2. 🚗 Detección de Vehículos (88% confianza base)**
- **Clasificaciones:** Auto, Camión, Motocicleta, Van de reparto
- **Análisis:** Placa vehicular, horario de acceso
- **Severidad:** Según permisos de zona

### **3. 🚨 Acceso No Autorizado (95% confianza base)**
- **Clasificaciones:** Entrada forzada, Tailgating, Acceso fuera de horario
- **Análisis:** Sensores de acceso, credenciales
- **Severidad:** Siempre crítica

### **4. ⚠️ Comportamiento Sospechoso (82% confianza base)**
- **Clasificaciones:** Merodeo, Movimiento inusual, Área restringida
- **Análisis:** Algoritmos conductuales, tiempo de permanencia
- **Severidad:** Alta por defecto

### **5. 📦 Detección de Objetos (78% confianza base)**
- **Clasificaciones:** Paquete, Bolsa, Equipo, Item desconocido
- **Análisis:** Forma, tiempo estacionario
- **Severidad:** Media a alta

### **6. 🐕 Detección de Animales (85% confianza base)**
- **Clasificaciones:** Perro, Gato, Ave, Fauna silvestre
- **Análisis:** Clasificador de especies, área permitida
- **Severidad:** Baja a media

## 🛠️ Tecnologías Utilizadas

### **Frontend:**
- **React Spring:** Animaciones fluidas y transiciones
- **Material-UI:** Componentes base y iconografía
- **TypeScript:** Tipado fuerte para ML types
- **Web Audio API:** Síntesis de sonidos por tipo

### **Simulación IA:**
- **Algoritmos de confianza** variables por tipo
- **Motor de clasificación** con categorías múltiples
- **Agrupación temporal** inteligente
- **Severidad adaptativa** basada en contexto

## 🔬 Datos Simulados Realistas

### **Generación de Alertas:**
- **30 alertas base** con distribución realista
- **Timestamps** en últimas 8 horas
- **Ubicaciones** basadas en edificios reales
- **Confidence scores** con variación natural

### **Bounding Boxes:**
- **Posición aleatoria** pero realista (10-70% del frame)
- **Tamaño variable** según tipo de objeto
- **Labels dinámicos** con porcentaje de confianza
- **Animaciones de pulso** para destacar detecciones

## 🎪 Casos de Uso

### **Centros de Monitoreo:**
- **Análisis en tiempo real** de alertas de seguridad
- **Priorización automática** por severidad y confianza
- **Reducción de falsos positivos** con agrupación

### **Entrenamiento de Personal:**
- **Simulación de escenarios** de seguridad
- **Comprensión de sistemas IA** en seguridad
- **Práctica en clasificación** de alertas

### **Demos Comerciales:**
- **Showcase de capacidades IA** avanzadas
- **Demostración de precisión** en detección
- **Diferenciación tecnológica** competitiva

## ✨ Características Destacadas

- **🧠 IA Simulada Realista:** Motor de ML con confianza variable
- **🎭 Bounding Boxes Animados:** Detecciones visuales impactantes  
- **🔊 Audio Inteligente:** Sonidos únicos por tipo de alerta
- **📊 Agrupación Temporal:** Algoritmo de clustering inteligente
- **⚡ Animaciones Fluidas:** React-spring para UX premium
- **🎯 Clasificación Automática:** Severidad basada en contexto
- **📱 Responsive Design:** Optimizado para cualquier pantalla
- **🔐 Control de Acceso:** Roles admin, manager, supervisor