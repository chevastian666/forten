/**
 * Q-Box Configuration
 * Configuration for FORTEN Q-Box devices communication
 */

export const QBOX_CONFIG = {
  // API Configuration
  API_BASE_URL: process.env.NEXT_PUBLIC_QBOX_API_URL || 'https://api.forten.com/qbox',
  API_VERSION: 'v1',
  
  // MQTT Configuration for real-time communication
  MQTT: {
    BROKER_URL: process.env.NEXT_PUBLIC_QBOX_MQTT_URL || 'wss://mqtt.forten.com:8883',
    USERNAME: process.env.NEXT_PUBLIC_QBOX_MQTT_USER || '',
    PASSWORD: process.env.QBOX_MQTT_PASSWORD || '',
    CLIENT_ID_PREFIX: 'forten-crm-',
    RECONNECT_PERIOD: 5000,
    CONNECT_TIMEOUT: 30000,
    QOS: 1,
    RETAIN: false
  },
  
  // Device Communication
  DEVICE: {
    HEARTBEAT_INTERVAL: 30000, // 30 seconds
    COMMAND_TIMEOUT: 10000, // 10 seconds
    MAX_RETRY_ATTEMPTS: 3,
    SYNC_INTERVAL: 300000 // 5 minutes
  },
  
  // API Endpoints
  ENDPOINTS: {
    // Device Management
    DEVICES_LIST: '/devices',
    DEVICE_REGISTER: '/devices/register',
    DEVICE_STATUS: '/devices/:deviceId/status',
    DEVICE_CONFIG: '/devices/:deviceId/config',
    DEVICE_RESTART: '/devices/:deviceId/restart',
    DEVICE_LOGS: '/devices/:deviceId/logs',
    
    // Access Control
    ACCESS_GRANT: '/access/grant',
    ACCESS_REVOKE: '/access/revoke',
    ACCESS_LIST: '/access/list',
    ACCESS_LOGS: '/access/logs',
    
    // PIN Management
    PIN_GENERATE: '/pins/generate',
    PIN_VALIDATE: '/pins/validate',
    PIN_REVOKE: '/pins/revoke',
    PIN_LIST: '/pins/list',
    PIN_BATCH: '/pins/batch',
    
    // Resident Sync
    RESIDENTS_SYNC: '/residents/sync',
    RESIDENTS_UPDATE: '/residents/update',
    RESIDENTS_DELETE: '/residents/delete',
    
    // Visitor Management
    VISITOR_REGISTER: '/visitors/register',
    VISITOR_LIST: '/visitors/list',
    VISITOR_UPDATE: '/visitors/update',
    
    // Events & Logs
    EVENTS_STREAM: '/events/stream',
    EVENTS_HISTORY: '/events/history',
    
    // Firmware
    FIRMWARE_CHECK: '/firmware/check',
    FIRMWARE_UPDATE: '/firmware/update'
  },
  
  // MQTT Topics
  MQTT_TOPICS: {
    // Device topics
    DEVICE_STATUS: 'qbox/+/status',
    DEVICE_COMMAND: 'qbox/+/command',
    DEVICE_RESPONSE: 'qbox/+/response',
    DEVICE_EVENT: 'qbox/+/event',
    DEVICE_HEARTBEAT: 'qbox/+/heartbeat',
    
    // Access topics
    ACCESS_REQUEST: 'qbox/+/access/request',
    ACCESS_GRANTED: 'qbox/+/access/granted',
    ACCESS_DENIED: 'qbox/+/access/denied',
    
    // PIN topics
    PIN_ENTERED: 'qbox/+/pin/entered',
    PIN_VALIDATED: 'qbox/+/pin/validated',
    
    // System topics
    SYSTEM_BROADCAST: 'qbox/system/broadcast',
    FIRMWARE_UPDATE: 'qbox/firmware/update'
  },
  
  // Q-Box Commands
  COMMANDS: {
    // Access Control
    OPEN_DOOR: 'OPEN_DOOR',
    CLOSE_DOOR: 'CLOSE_DOOR',
    LOCK_DOOR: 'LOCK_DOOR',
    UNLOCK_DOOR: 'UNLOCK_DOOR',
    EMERGENCY_OPEN: 'EMERGENCY_OPEN',
    
    // Device Control
    RESTART: 'RESTART',
    FACTORY_RESET: 'FACTORY_RESET',
    UPDATE_CONFIG: 'UPDATE_CONFIG',
    GET_STATUS: 'GET_STATUS',
    GET_LOGS: 'GET_LOGS',
    CLEAR_LOGS: 'CLEAR_LOGS',
    
    // User Management
    SYNC_USERS: 'SYNC_USERS',
    ADD_USER: 'ADD_USER',
    REMOVE_USER: 'REMOVE_USER',
    UPDATE_USER: 'UPDATE_USER',
    
    // PIN Management
    ADD_PIN: 'ADD_PIN',
    REMOVE_PIN: 'REMOVE_PIN',
    VALIDATE_PIN: 'VALIDATE_PIN',
    CLEAR_ALL_PINS: 'CLEAR_ALL_PINS',
    
    // Audio/Video
    CALL_APARTMENT: 'CALL_APARTMENT',
    ANSWER_CALL: 'ANSWER_CALL',
    END_CALL: 'END_CALL',
    TAKE_SNAPSHOT: 'TAKE_SNAPSHOT',
    
    // System
    PLAY_SOUND: 'PLAY_SOUND',
    DISPLAY_MESSAGE: 'DISPLAY_MESSAGE',
    UPDATE_FIRMWARE: 'UPDATE_FIRMWARE'
  },
  
  // PIN Configuration
  PIN: {
    LENGTH: 4,
    EXPIRY_HOURS: 24,
    MAX_ATTEMPTS: 3,
    BLOCK_DURATION: 300000, // 5 minutes
    TYPES: {
      PERMANENT: 'permanent',
      TEMPORARY: 'temporary',
      ONE_TIME: 'one_time',
      RECURRING: 'recurring'
    }
  },
  
  // Access Types
  ACCESS_TYPES: {
    RESIDENT: 'resident',
    VISITOR: 'visitor',
    DELIVERY: 'delivery',
    SERVICE: 'service',
    EMERGENCY: 'emergency',
    ADMIN: 'admin'
  },
  
  // Device Models
  DEVICE_MODELS: {
    QBOX_V1: 'Q-Box v1.0',
    QBOX_V2: 'Q-Box v2.0',
    QBOX_PRO: 'Q-Box Pro',
    QBOX_LITE: 'Q-Box Lite'
  },
  
  // Device Status
  DEVICE_STATUS: {
    ONLINE: 'online',
    OFFLINE: 'offline',
    MAINTENANCE: 'maintenance',
    ERROR: 'error',
    UPDATING: 'updating'
  },
  
  // Error Codes
  ERROR_CODES: {
    // Connection errors
    E001: 'Device offline',
    E002: 'Connection timeout',
    E003: 'Authentication failed',
    E004: 'Invalid device ID',
    
    // Access errors
    E101: 'Access denied',
    E102: 'Invalid PIN',
    E103: 'PIN expired',
    E104: 'User blocked',
    E105: 'Maximum attempts exceeded',
    
    // Device errors
    E201: 'Device malfunction',
    E202: 'Door sensor error',
    E203: 'Lock mechanism error',
    E204: 'Camera error',
    E205: 'Audio system error',
    
    // System errors
    E301: 'Database sync error',
    E302: 'Firmware update failed',
    E303: 'Configuration error',
    E304: 'Memory full',
    
    // Network errors
    E401: 'Network unreachable',
    E402: 'DNS resolution failed',
    E403: 'SSL/TLS error',
    E404: 'Proxy error'
  },
  
  // Sound Files
  SOUNDS: {
    WELCOME: 'welcome.mp3',
    ACCESS_GRANTED: 'access_granted.mp3',
    ACCESS_DENIED: 'access_denied.mp3',
    DOORBELL: 'doorbell.mp3',
    ERROR: 'error.mp3',
    NOTIFICATION: 'notification.mp3'
  }
};

// Q-Box Event Types
export const QBOX_EVENT_TYPES = {
  // Access Events
  ACCESS_GRANTED: 'access.granted',
  ACCESS_DENIED: 'access.denied',
  DOOR_OPENED: 'door.opened',
  DOOR_CLOSED: 'door.closed',
  DOOR_FORCED: 'door.forced',
  DOOR_HELD_OPEN: 'door.held_open',
  
  // PIN Events
  PIN_ENTERED: 'pin.entered',
  PIN_VALIDATED: 'pin.validated',
  PIN_INVALID: 'pin.invalid',
  PIN_EXPIRED: 'pin.expired',
  PIN_BLOCKED: 'pin.blocked',
  
  // Call Events
  CALL_INITIATED: 'call.initiated',
  CALL_ANSWERED: 'call.answered',
  CALL_ENDED: 'call.ended',
  CALL_MISSED: 'call.missed',
  
  // Device Events
  DEVICE_ONLINE: 'device.online',
  DEVICE_OFFLINE: 'device.offline',
  DEVICE_RESTARTED: 'device.restarted',
  DEVICE_ERROR: 'device.error',
  DEVICE_TAMPERED: 'device.tampered',
  
  // System Events
  FIRMWARE_UPDATING: 'firmware.updating',
  FIRMWARE_UPDATED: 'firmware.updated',
  CONFIG_CHANGED: 'config.changed',
  SYNC_COMPLETED: 'sync.completed',
  SYNC_FAILED: 'sync.failed'
};

// Q-Box Response Codes
export const QBOX_RESPONSE_CODES = {
  SUCCESS: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TIMEOUT: 408,
  CONFLICT: 409,
  DEVICE_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  SERVICE_UNAVAILABLE: 503
};