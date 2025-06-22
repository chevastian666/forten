/**
 * WhatsApp Business API Types
 * Type definitions for WhatsApp Business API
 */

// Base Message Types
export interface WhatsAppMessage {
  messaging_product: 'whatsapp';
  recipient_type?: 'individual';
  to: string;
  type: MessageType;
  context?: MessageContext;
}

export interface MessageContext {
  message_id: string;
}

export type MessageType = 
  | 'text' 
  | 'image' 
  | 'document' 
  | 'video' 
  | 'audio' 
  | 'location' 
  | 'template' 
  | 'interactive' 
  | 'contacts' 
  | 'sticker';

// Text Message
export interface TextMessage extends WhatsAppMessage {
  type: 'text';
  text: {
    body: string;
    preview_url?: boolean;
  };
}

// Image Message
export interface ImageMessage extends WhatsAppMessage {
  type: 'image';
  image: {
    id?: string;
    link?: string;
    caption?: string;
  };
}

// Document Message
export interface DocumentMessage extends WhatsAppMessage {
  type: 'document';
  document: {
    id?: string;
    link?: string;
    caption?: string;
    filename?: string;
  };
}

// Video Message
export interface VideoMessage extends WhatsAppMessage {
  type: 'video';
  video: {
    id?: string;
    link?: string;
    caption?: string;
  };
}

// Audio Message
export interface AudioMessage extends WhatsAppMessage {
  type: 'audio';
  audio: {
    id?: string;
    link?: string;
  };
}

// Location Message
export interface LocationMessage extends WhatsAppMessage {
  type: 'location';
  location: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
}

// Template Message
export interface TemplateMessage extends WhatsAppMessage {
  type: 'template';
  template: {
    name: string;
    language: {
      code: string;
    };
    components?: TemplateComponent[];
  };
}

export interface TemplateComponent {
  type: 'header' | 'body' | 'button';
  sub_type?: 'quick_reply' | 'url';
  index?: number;
  parameters: TemplateParameter[];
}

export interface TemplateParameter {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video';
  text?: string;
  image?: { link: string };
  document?: { link: string; filename?: string };
  video?: { link: string };
  currency?: {
    fallback_value: string;
    code: string;
    amount_1000: number;
  };
  date_time?: {
    fallback_value: string;
  };
}

// Interactive Message
export interface InteractiveMessage extends WhatsAppMessage {
  type: 'interactive';
  interactive: ButtonInteractive | ListInteractive;
}

export interface ButtonInteractive {
  type: 'button';
  header?: InteractiveHeader;
  body: InteractiveBody;
  footer?: InteractiveFooter;
  action: {
    buttons: InteractiveButton[];
  };
}

export interface ListInteractive {
  type: 'list';
  header?: InteractiveHeader;
  body: InteractiveBody;
  footer?: InteractiveFooter;
  action: {
    button: string;
    sections: ListSection[];
  };
}

export interface InteractiveHeader {
  type: 'text' | 'video' | 'image' | 'document';
  text?: string;
  video?: { link: string };
  image?: { link: string };
  document?: { link: string; filename?: string };
}

export interface InteractiveBody {
  text: string;
}

export interface InteractiveFooter {
  text: string;
}

export interface InteractiveButton {
  type: 'reply';
  reply: {
    id: string;
    title: string;
  };
}

export interface ListSection {
  title?: string;
  rows: ListRow[];
}

export interface ListRow {
  id: string;
  title: string;
  description?: string;
}

// API Responses
export interface SendMessageResponse {
  messaging_product: 'whatsapp';
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
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
  messaging_product: 'whatsapp';
}

// Webhook Types
export interface WebhookPayload {
  object: 'whatsapp_business_account';
  entry: WebhookEntry[];
}

export interface WebhookEntry {
  id: string;
  changes: WebhookChange[];
}

export interface WebhookChange {
  value: WebhookValue;
  field: string;
}

export interface WebhookValue {
  messaging_product: 'whatsapp';
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: WebhookContact[];
  messages?: IncomingMessage[];
  statuses?: MessageStatus[];
  errors?: WebhookError[];
}

export interface WebhookContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

export interface IncomingMessage {
  id: string;
  from: string;
  timestamp: string;
  type: MessageType;
  text?: {
    body: string;
  };
  image?: {
    caption?: string;
    mime_type: string;
    sha256: string;
    id: string;
  };
  document?: {
    caption?: string;
    filename?: string;
    mime_type: string;
    sha256: string;
    id: string;
  };
  video?: {
    caption?: string;
    mime_type: string;
    sha256: string;
    id: string;
  };
  audio?: {
    mime_type: string;
    sha256: string;
    id: string;
    voice: boolean;
  };
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  button?: {
    text: string;
    payload: string;
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
  errors?: WebhookError[];
}

export interface MessageStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  conversation?: {
    id: string;
    expiration_timestamp?: string;
    origin: {
      type: 'user_initiated' | 'business_initiated' | 'referral_conversion';
    };
  };
  pricing?: {
    billable: boolean;
    pricing_model: string;
    category: string;
  };
  errors?: WebhookError[];
}

export interface WebhookError {
  code: number;
  title: string;
  message?: string;
  error_data?: {
    details: string;
  };
}

// Business Profile
export interface BusinessProfile {
  messaging_product: 'whatsapp';
  address: string;
  description: string;
  vertical: string;
  email: string;
  websites: string[];
  profile_picture_url: string;
}

// Contact Types
export interface Contact {
  name: ContactName;
  phones?: ContactPhone[];
  emails?: ContactEmail[];
  addresses?: ContactAddress[];
  org?: ContactOrg;
  urls?: ContactUrl[];
}

export interface ContactName {
  formatted_name: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  suffix?: string;
  prefix?: string;
}

export interface ContactPhone {
  phone: string;
  type?: 'CELL' | 'MAIN' | 'IPHONE' | 'HOME' | 'WORK';
  wa_id?: string;
}

export interface ContactEmail {
  email: string;
  type?: 'HOME' | 'WORK';
}

export interface ContactAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  country_code?: string;
  type?: 'HOME' | 'WORK';
}

export interface ContactOrg {
  company?: string;
  department?: string;
  title?: string;
}

export interface ContactUrl {
  url: string;
  type?: 'HOME' | 'WORK';
}

// Conversation Types
export interface Conversation {
  id: string;
  contact: ConversationContact;
  messages: ConversationMessage[];
  lastMessage?: ConversationMessage;
  unreadCount: number;
  status: 'active' | 'archived' | 'expired';
  createdAt: Date;
  updatedAt: Date;
  labels?: string[];
}

export interface ConversationContact {
  wa_id: string;
  name: string;
  phone: string;
  profilePicture?: string;
  about?: string;
  isBlocked: boolean;
  tags?: string[];
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  type: MessageType;
  direction: 'inbound' | 'outbound';
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  content: any;
  timestamp: Date;
  errors?: WebhookError[];
}

// Template Management
export interface MessageTemplate {
  id: string;
  name: string;
  language: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  category: 'AUTHENTICATION' | 'MARKETING' | 'UTILITY';
  components: TemplateComponentDefinition[];
  rejectedReason?: string;
}

export interface TemplateComponentDefinition {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  example?: {
    header_text?: string[];
    body_text?: string[][];
    header_handle?: string[];
  };
  buttons?: Array<{
    type: 'QUICK_REPLY' | 'PHONE_NUMBER' | 'URL';
    text: string;
    phone_number?: string;
    url?: string;
    example?: string[];
  }>;
}

// Broadcast Types
export interface BroadcastCampaign {
  id: string;
  name: string;
  templateId: string;
  recipients: BroadcastRecipient[];
  scheduledAt?: Date;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed';
  stats: BroadcastStats;
  createdAt: Date;
  updatedAt: Date;
}

export interface BroadcastRecipient {
  wa_id: string;
  name: string;
  variables?: Record<string, string>;
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  error?: string;
}

export interface BroadcastStats {
  total: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  pending: number;
}