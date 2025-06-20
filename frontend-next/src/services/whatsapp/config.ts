/**
 * WhatsApp Business API Configuration
 * Configuration for WhatsApp Business API integration
 */

export const WHATSAPP_CONFIG = {
  // API Configuration
  API_URL: process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://graph.facebook.com',
  API_VERSION: process.env.NEXT_PUBLIC_WHATSAPP_API_VERSION || 'v17.0',
  PHONE_NUMBER_ID: process.env.NEXT_PUBLIC_WHATSAPP_PHONE_NUMBER_ID || '',
  BUSINESS_ACCOUNT_ID: process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_ACCOUNT_ID || '',
  ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN || '',
  VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN || '',
  
  // Backend WebSocket for real-time messaging
  WEBSOCKET_URL: process.env.NEXT_PUBLIC_WHATSAPP_WS_URL || 'wss://api.forten.com/whatsapp',
  
  // Media Configuration
  MAX_FILE_SIZE: 16 * 1024 * 1024, // 16MB
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png'],
  SUPPORTED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  SUPPORTED_VIDEO_TYPES: ['video/mp4', 'video/3gpp'],
  SUPPORTED_AUDIO_TYPES: ['audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg'],
  
  // Message Configuration
  MESSAGE_WINDOW_HOURS: 24, // 24-hour customer service window
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  MAX_MESSAGE_LENGTH: 4096,
  MAX_BUTTONS: 3,
  MAX_LIST_ITEMS: 10,
  
  // Rate Limits
  RATE_LIMITS: {
    MESSAGES_PER_SECOND: 80,
    MESSAGES_PER_MINUTE: 1000,
    MESSAGES_PER_HOUR: 10000,
    BROADCAST_BATCH_SIZE: 50,
    BROADCAST_DELAY_MS: 1000
  },
  
  // Notification Templates (pre-approved by WhatsApp)
  TEMPLATES: {
    // Access notification when visitor arrives
    ACCESS_NOTIFICATION: 'access_notification',
    
    // Visitor arrival notification
    VISITOR_ARRIVAL: 'visitor_arrival',
    
    // Delivery notification
    DELIVERY_NOTIFICATION: 'delivery_notification',
    
    // Emergency alert
    EMERGENCY_ALERT: 'emergency_alert',
    
    // Maintenance notice
    MAINTENANCE_NOTICE: 'maintenance_notice',
    
    // Security alert
    SECURITY_ALERT: 'security_alert',
    
    // Welcome message for new residents
    WELCOME_MESSAGE: 'welcome_message',
    
    // PIN notification
    PIN_NOTIFICATION: 'pin_notification',
    
    // Payment reminder
    PAYMENT_REMINDER: 'payment_reminder',
    
    // General announcement
    GENERAL_ANNOUNCEMENT: 'general_announcement'
  },
  
  // Quick Reply Options
  QUICK_REPLIES: {
    AUTHORIZE_ACCESS: {
      YES: { id: 'authorize_yes', title: 'Sí, autorizar' },
      NO: { id: 'authorize_no', title: 'No autorizar' },
      CALL: { id: 'authorize_call', title: 'Llamarme' }
    },
    DELIVERY_OPTIONS: {
      RECEIVE: { id: 'delivery_receive', title: 'Recibir' },
      REJECT: { id: 'delivery_reject', title: 'Rechazar' },
      LEAVE: { id: 'delivery_leave', title: 'Dejar en portería' }
    },
    EMERGENCY_CONFIRM: {
      CONFIRM: { id: 'emergency_confirm', title: 'Confirmar emergencia' },
      CANCEL: { id: 'emergency_cancel', title: 'Cancelar' }
    }
  },
  
  // Interactive List Sections
  LIST_SECTIONS: {
    ACCESS_ACTIONS: {
      title: 'Acciones rápidas',
      items: [
        { id: 'extend_access', title: 'Extender acceso', description: 'Extender validez por 24 horas' },
        { id: 'revoke_access', title: 'Revocar acceso', description: 'Cancelar acceso inmediatamente' },
        { id: 'view_details', title: 'Ver detalles', description: 'Información completa del acceso' }
      ]
    },
    SUPPORT_OPTIONS: {
      title: 'Opciones de soporte',
      items: [
        { id: 'report_issue', title: 'Reportar problema', description: 'Informar un problema técnico' },
        { id: 'request_maintenance', title: 'Solicitar mantenimiento', description: 'Solicitar servicio de mantenimiento' },
        { id: 'contact_admin', title: 'Contactar administración', description: 'Hablar con la administración' }
      ]
    }
  },
  
  // Commands
  COMMANDS: {
    HELP: ['/ayuda', '/help'],
    STATUS: ['/estado', '/status'],
    ACCESS: ['/accesos', '/access'],
    EMERGENCY: ['/emergencia', '/emergency'],
    SUPPORT: ['/soporte', '/support'],
    NOTIFICATIONS: ['/notificaciones', '/notifications']
  },
  
  // Error Messages
  ERRORS: {
    INVALID_PHONE: 'Número de teléfono inválido',
    MESSAGE_FAILED: 'Error al enviar mensaje',
    TEMPLATE_NOT_FOUND: 'Plantilla no encontrada',
    RATE_LIMIT_EXCEEDED: 'Límite de mensajes excedido',
    INVALID_MEDIA: 'Archivo multimedia no válido',
    SESSION_EXPIRED: 'Sesión expirada',
    UNAUTHORIZED: 'No autorizado',
    WEBHOOK_VERIFICATION_FAILED: 'Verificación de webhook fallida'
  },
  
  // Status Messages
  STATUS: {
    SENDING: 'Enviando...',
    SENT: 'Enviado',
    DELIVERED: 'Entregado',
    READ: 'Leído',
    FAILED: 'Fallido',
    PENDING: 'Pendiente'
  }
};

// Message Types
export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  DOCUMENT: 'document',
  VIDEO: 'video',
  AUDIO: 'audio',
  LOCATION: 'location',
  TEMPLATE: 'template',
  INTERACTIVE: 'interactive',
  CONTACTS: 'contacts',
  STICKER: 'sticker'
} as const;

// Interactive Types
export const INTERACTIVE_TYPES = {
  BUTTON: 'button',
  LIST: 'list',
  PRODUCT: 'product',
  PRODUCT_LIST: 'product_list'
} as const;

// Webhook Event Types
export const WEBHOOK_EVENTS = {
  MESSAGES: 'messages',
  STATUS: 'statuses',
  ERRORS: 'errors',
  BUSINESS_CAPABILITY_UPDATE: 'business_capability_update',
  PHONE_NUMBER_NAME_UPDATE: 'phone_number_name_update',
  TEMPLATE_STATUS_UPDATE: 'template_status_update',
  FLOW_STATUS_UPDATE: 'flow_status_update'
} as const;