import { store } from '../store';
import { addEvent } from '../store/eventSlice';
import NotificationService from './notificationService';

export interface SimulatedActivity {
  events: boolean;
  calls: boolean;
  access: boolean;
  whatsapp: boolean;
  deliveries: boolean;
  interval: number; // milliseconds
}

class PresentationModeService {
  private isActive = false;
  private intervalIds: NodeJS.Timeout[] = [];
  private activities: SimulatedActivity = {
    events: true,
    calls: true,
    access: true,
    whatsapp: true,
    deliveries: true,
    interval: 5000,
  };

  // Mock data for realistic simulation
  private visitorsData = [
    { name: 'María García', apt: '4A', image: 'https://i.pravatar.cc/150?img=1' },
    { name: 'Juan Pérez', apt: '7B', image: 'https://i.pravatar.cc/150?img=2' },
    { name: 'Carlos López', apt: '2C', image: 'https://i.pravatar.cc/150?img=3' },
    { name: 'Ana Martínez', apt: '10D', image: 'https://i.pravatar.cc/150?img=4' },
    { name: 'Roberto Silva', apt: '5E', image: 'https://i.pravatar.cc/150?img=5' },
    { name: 'Laura Rodríguez', apt: '8F', image: 'https://i.pravatar.cc/150?img=6' },
  ];

  private eventTypes = [
    { type: 'security', title: 'Movimiento detectado', location: 'Entrada Principal' },
    { type: 'access', title: 'Acceso autorizado', location: 'Portón vehicular' },
    { type: 'maintenance', title: 'Sensor de temperatura elevada', location: 'Sala de máquinas' },
    { type: 'emergency', title: 'Alarma de incendio - TEST', location: 'Piso 3' },
    { type: 'system', title: 'Respaldo completado', location: 'Sistema' },
  ];

  private whatsappMessages = [
    'Delivery de MercadoLibre en puerta principal',
    'Visita de técnico de Antel programada',
    'Paquete dejado en recepción',
    'Reunión de consorcio esta noche a las 20:00',
    'Mantenimiento de ascensor mañana 10:00',
  ];

  private deliveryCompanies = [
    { name: 'MercadoLibre', prefix: 'ML' },
    { name: 'Amazon', prefix: 'AMZ' },
    { name: 'Uber Eats', prefix: 'UBR' },
    { name: 'Rappi', prefix: 'RAP' },
    { name: 'PedidosYa', prefix: 'PYA' },
    { name: 'DHL', prefix: 'DHL' },
  ];

  start(config?: Partial<SimulatedActivity>) {
    if (this.isActive) return;
    
    this.isActive = true;
    this.activities = { ...this.activities, ...config };

    NotificationService.info('Modo presentación activado');

    // Start generating events
    if (this.activities.events) {
      this.startEventSimulation();
    }

    if (this.activities.calls) {
      this.startCallSimulation();
    }

    if (this.activities.access) {
      this.startAccessSimulation();
    }

    if (this.activities.whatsapp) {
      this.startWhatsAppSimulation();
    }

    if (this.activities.deliveries) {
      this.startDeliverySimulation();
    }
  }

  stop() {
    this.isActive = false;
    this.intervalIds.forEach(id => clearTimeout(id));
    this.intervalIds = [];
    NotificationService.info('Modo presentación desactivado');
  }

  private startEventSimulation() {
    const generateEvent = () => {
      if (!this.isActive) return;

      const event = this.eventTypes[Math.floor(Math.random() * this.eventTypes.length)];
      const buildingId = Math.random() > 0.5 ? 'building-1' : 'building-2';
      
      const newEvent = {
        id: `demo-event-${Date.now()}`,
        buildingId,
        type: event.type as any,
        title: event.title,
        description: `${event.title} en ${event.location}`,
        priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any,
        severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any,
        status: 'pending' as const,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      store.dispatch(addEvent(newEvent));

      // Show AI alert for security events
      if (event.type === 'security' && Math.random() > 0.5) {
        NotificationService.aiAlert({
          type: 'suspicious_behavior',
          title: 'Posible intrusión detectada',
          location: event.location,
          confidence: 0.85 + Math.random() * 0.14,
          severity: 'high',
        });
      }

      // Schedule next event
      const nextInterval = this.activities.interval + (Math.random() * 5000 - 2500);
      const timeoutId = setTimeout(generateEvent, nextInterval);
      this.intervalIds.push(timeoutId);
    };

    generateEvent();
  }

  private startCallSimulation() {
    const simulateCall = () => {
      if (!this.isActive) return;

      const visitor = this.visitorsData[Math.floor(Math.random() * this.visitorsData.length)];
      
      // Dispatch custom event for incoming call
      window.dispatchEvent(new CustomEvent('incomingCall', {
        detail: {
          visitorName: visitor.name,
          apartment: visitor.apt,
          image: visitor.image,
          timestamp: new Date(),
        }
      }));

      // Schedule next call
      const nextInterval = this.activities.interval * 3 + (Math.random() * 10000);
      const timeoutId = setTimeout(simulateCall, nextInterval);
      this.intervalIds.push(timeoutId);
    };

    // First call after 5 seconds
    const timeoutId = setTimeout(simulateCall, 5000);
    this.intervalIds.push(timeoutId);
  }

  private startAccessSimulation() {
    const simulateAccess = () => {
      if (!this.isActive) return;

      const isAuthorized = Math.random() > 0.2;
      const accessPoint = ['Entrada Principal', 'Portón Vehicular', 'Entrada de Servicio'][Math.floor(Math.random() * 3)];
      
      NotificationService.systemAlert(
        `Acceso ${isAuthorized ? 'autorizado' : 'denegado'} - ${accessPoint}`,
        isAuthorized ? 'access' : 'security'
      );

      // Schedule next access
      const nextInterval = this.activities.interval * 2 + (Math.random() * 8000);
      const timeoutId = setTimeout(simulateAccess, nextInterval);
      this.intervalIds.push(timeoutId);
    };

    const timeoutId = setTimeout(simulateAccess, 8000);
    this.intervalIds.push(timeoutId);
  }

  private startWhatsAppSimulation() {
    const simulateWhatsApp = () => {
      if (!this.isActive) return;

      const message = this.whatsappMessages[Math.floor(Math.random() * this.whatsappMessages.length)];
      const apartment = `${Math.floor(Math.random() * 10) + 1}${['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]}`;
      
      // Dispatch custom event for WhatsApp message
      window.dispatchEvent(new CustomEvent('whatsappMessage', {
        detail: {
          message,
          apartment,
          timestamp: new Date(),
        }
      }));

      NotificationService.success(`WhatsApp: ${message} (Apto ${apartment})`);

      // Schedule next message
      const nextInterval = this.activities.interval * 4 + (Math.random() * 15000);
      const timeoutId = setTimeout(simulateWhatsApp, nextInterval);
      this.intervalIds.push(timeoutId);
    };

    const timeoutId = setTimeout(simulateWhatsApp, 10000);
    this.intervalIds.push(timeoutId);
  }

  private startDeliverySimulation() {
    const simulateDelivery = () => {
      if (!this.isActive) return;

      const company = this.deliveryCompanies[Math.floor(Math.random() * this.deliveryCompanies.length)];
      const visitor = this.visitorsData[Math.floor(Math.random() * this.visitorsData.length)];
      const trackingNumber = `${company.prefix}${Math.random().toString().substr(2, 9)}`;
      const statuses = ['en_camino', 'en_edificio', 'en_casillero'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      // Dispatch custom event for delivery update
      window.dispatchEvent(new CustomEvent('deliveryUpdate', {
        detail: {
          id: `delivery-${Date.now()}`,
          trackingNumber,
          apartment: visitor.apt,
          recipient: visitor.name,
          company: company.name,
          status,
          priority: Math.random() > 0.7 ? 'express' : 'normal',
          timestamp: new Date(),
        }
      }));

      // Show notification based on status
      switch (status) {
        case 'en_camino':
          NotificationService.info(`📦 ${company.name}: Delivery en camino para ${visitor.apt}`);
          break;
        case 'en_edificio':
          NotificationService.warning(`🏢 ${company.name}: Delivery llegó - ${visitor.apt}`);
          break;
        case 'en_casillero':
          NotificationService.success(`🔒 Paquete en casillero para ${visitor.apt}`);
          // Send WhatsApp notification
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('whatsappMessage', {
              detail: {
                message: `📦 Su paquete de ${company.name} está disponible en casillero L-A${Math.floor(Math.random() * 3) + 1}. Código: QR${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
                apartment: visitor.apt,
                timestamp: new Date(),
              }
            }));
          }, 2000);
          break;
      }

      // Schedule next delivery
      const nextInterval = this.activities.interval * 6 + (Math.random() * 20000);
      const timeoutId = setTimeout(simulateDelivery, nextInterval);
      this.intervalIds.push(timeoutId);
    };

    const timeoutId = setTimeout(simulateDelivery, 12000);
    this.intervalIds.push(timeoutId);
  }

  isRunning() {
    return this.isActive;
  }

  getConfig() {
    return { ...this.activities };
  }
}

const presentationModeService = new PresentationModeService();
export default presentationModeService;