export interface WhatsAppConfig {
  apiUrl: string;
  apiVersion: string;
  phoneNumberId: string;
  businessAccountId: string;
  accessToken: string;
  verifyToken: string;
  webhookUrl?: string;
}

export interface WhatsAppMessage {
  to: string;
  type: 'text' | 'template' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'interactive';
  content: any;
}

export interface WhatsAppTextMessage extends WhatsAppMessage {
  type: 'text';
  content: {
    body: string;
    preview_url?: boolean;
  };
}

export interface WhatsAppTemplateMessage extends WhatsAppMessage {
  type: 'template';
  content: {
    name: string;
    language: {
      code: string;
    };
    components?: TemplateComponent[];
  };
}

export interface TemplateComponent {
  type: 'header' | 'body' | 'button';
  parameters: TemplateParameter[];
  sub_type?: string;
  index?: number;
}

export interface TemplateParameter {
  type: 'text' | 'image' | 'video' | 'document';
  text?: string;
  image?: MediaObject;
  video?: MediaObject;
  document?: MediaObject;
}

export interface MediaObject {
  link?: string;
  id?: string;
  caption?: string;
  filename?: string;
}

export interface WhatsAppImageMessage extends WhatsAppMessage {
  type: 'image';
  content: {
    image: MediaObject;
  };
}

export interface WhatsAppLocationMessage extends WhatsAppMessage {
  type: 'location';
  content: {
    location: {
      latitude: number;
      longitude: number;
      name?: string;
      address?: string;
    };
  };
}

export interface WhatsAppInteractiveMessage extends WhatsAppMessage {
  type: 'interactive';
  content: {
    type: 'button' | 'list';
    header?: {
      type: 'text' | 'image' | 'video' | 'document';
      text?: string;
      image?: MediaObject;
      video?: MediaObject;
      document?: MediaObject;
    };
    body: {
      text: string;
    };
    footer?: {
      text: string;
    };
    action: ButtonAction | ListAction;
  };
}

export interface ButtonAction {
  buttons: Array<{
    type: 'reply';
    reply: {
      id: string;
      title: string;
    };
  }>;
}

export interface ListAction {
  button: string;
  sections: Array<{
    title?: string;
    rows: Array<{
      id: string;
      title: string;
      description?: string;
    }>;
  }>;
}

export interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: Array<IncomingMessage>;
        statuses?: Array<MessageStatus>;
      };
      field: string;
    }>;
  }>;
}

export interface IncomingMessage {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: {
    body: string;
  };
  image?: MediaObject & { mime_type: string; sha256: string };
  video?: MediaObject & { mime_type: string; sha256: string };
  audio?: MediaObject & { mime_type: string; sha256: string; voice: boolean };
  document?: MediaObject & { mime_type: string; sha256: string };
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  interactive?: {
    type: 'button_reply' | 'list_reply';
    button_reply?: {
      id: string;
      title: string;
    };
    list_reply?: {
      id: string;
      title: string;
      description?: string;
    };
  };
  context?: {
    from: string;
    id: string;
  };
}

export interface MessageStatus {
  id: string;
  recipient_id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  errors?: Array<{
    code: number;
    title: string;
    message: string;
    error_data?: {
      details: string;
    };
  }>;
}

export interface SendMessageResponse {
  messaging_product: string;
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
    message_status?: string;
  }>;
}

export interface UploadMediaResponse {
  id: string;
}

export interface MediaUrlResponse {
  url: string;
  mime_type: string;
  sha256: string;
  file_size: number;
  id: string;
  messaging_product: string;
}

// Template definitions for FORTEN
export interface FortenTemplates {
  access_notification: {
    name: 'access_notification';
    params: [visitorName: string, apartment: string, pin: string];
  };
  visitor_arrival: {
    name: 'visitor_arrival';
    params: [visitorName: string, imageUrl?: string];
  };
  delivery_notification: {
    name: 'delivery_notification';
    params: [courierCompany: string, packageDescription: string];
  };
  emergency_alert: {
    name: 'emergency_alert';
    params: [alertType: string, location: string, instructions: string];
  };
  maintenance_notice: {
    name: 'maintenance_notice';
    params: [serviceType: string, date: string, time: string, duration: string];
  };
  payment_reminder: {
    name: 'payment_reminder';
    params: [amount: string, dueDate: string, concept: string];
  };
  security_alert: {
    name: 'security_alert';
    params: [alertType: string, description: string, time: string];
  };
}

export interface Resident {
  id: string;
  name: string;
  phone: string;
  apartment: string;
  buildingId: string;
  preferredLanguage: string;
  notificationPreferences: {
    whatsapp: boolean;
    visitorsNotifications: boolean;
    deliveryNotifications: boolean;
    emergencyAlerts: boolean;
    maintenanceNotices: boolean;
    paymentReminders: boolean;
    securityAlerts: boolean;
  };
}

export interface Visitor {
  id: string;
  name: string;
  documentId: string;
  phone?: string;
  apartment: string;
  pin: string;
  validFrom: Date;
  validUntil: Date;
  type: 'guest' | 'delivery' | 'service' | 'contractor';
  company?: string;
  vehiclePlate?: string;
  photo?: string;
}