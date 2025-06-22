/**
 * HikCentral API Configuration
 * Documentation: https://www.hikvision.com/en/support/download/sdk/
 */

export const HIKVISION_CONFIG = {
  // API Endpoints
  API_BASE_URL: process.env.NEXT_PUBLIC_HIKVISION_API_URL || 'https://hikcentral.forten.com/api',
  ARTEMIS_PATH: '/artemis',
  
  // Authentication
  APP_KEY: process.env.NEXT_PUBLIC_HIKVISION_APP_KEY || '',
  APP_SECRET: process.env.HIKVISION_APP_SECRET || '', // Keep in server-side only
  
  // API Paths
  PATHS: {
    // Authentication
    AUTH_TOKEN: '/api/v1/oauth/token',
    
    // Camera Management
    CAMERAS_LIST: '/api/resource/v2/camera/advance/cameraList',
    CAMERA_INFO: '/api/resource/v1/cameras',
    CAMERA_PREVIEW: '/api/video/v2/cameras/previewURLs',
    CAMERA_PLAYBACK: '/api/video/v2/cameras/playbackURLs',
    
    // PTZ Control
    PTZ_CONTROL: '/api/video/v1/ptzs/controlling',
    PTZ_PRESET: '/api/video/v1/ptzs/presets',
    
    // Events & Alarms
    EVENTS_SEARCH: '/api/eventService/v1/eventLogs/searches',
    ALARM_SUBSCRIPTION: '/api/eventService/v1/eventSubscription',
    
    // Recording
    MANUAL_RECORDING: '/api/video/v1/manualRecording/start',
    RECORDING_SEARCH: '/api/video/v2/records/searches',
    
    // Device Management
    ENCODING_DEVICES: '/api/resource/v1/encodeDevice/get',
    DEVICE_STATUS: '/api/nms/v1/online/status',
    
    // Access Control Integration
    DOOR_STATUS: '/api/acs/v1/door/states',
    ACCESS_RECORDS: '/api/acs/v1/accessRecords/searches'
  },
  
  // Streaming Configuration
  STREAMING: {
    PROTOCOL: 'rtsp', // rtsp, hls, ws-flv
    STREAM_TYPE: 'main', // main, sub
    TRANSMODE: 'tcp', // tcp, udp
    TIMEOUT: 30000, // 30 seconds
    RECONNECT_INTERVAL: 5000, // 5 seconds
    MAX_RECONNECT_ATTEMPTS: 3
  },
  
  // WebSocket Configuration
  WEBSOCKET: {
    URL: process.env.NEXT_PUBLIC_HIKVISION_WS_URL || 'wss://hikcentral.forten.com/ws',
    HEARTBEAT_INTERVAL: 30000, // 30 seconds
    RECONNECT_DELAY: 3000
  },
  
  // Security Headers
  SECURITY_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': '*/*',
    'X-Ca-Key': '', // Will be set dynamically
    'X-Ca-Signature': '', // Will be calculated
    'X-Ca-Timestamp': '', // Will be set dynamically
    'X-Ca-Nonce': '' // Will be generated
  }
};

// Camera Stream Quality Profiles
export const STREAM_PROFILES = {
  HIGH: {
    resolution: '1920x1080',
    bitrate: 4096,
    framerate: 30,
    codec: 'h264'
  },
  MEDIUM: {
    resolution: '1280x720',
    bitrate: 2048,
    framerate: 25,
    codec: 'h264'
  },
  LOW: {
    resolution: '640x480',
    bitrate: 512,
    framerate: 15,
    codec: 'h264'
  },
  MOBILE: {
    resolution: '320x240',
    bitrate: 256,
    framerate: 10,
    codec: 'h264'
  }
};

// PTZ Commands
export const PTZ_COMMANDS = {
  // Directions
  UP: 'UP',
  DOWN: 'DOWN',
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
  LEFT_UP: 'LEFT_UP',
  LEFT_DOWN: 'LEFT_DOWN',
  RIGHT_UP: 'RIGHT_UP',
  RIGHT_DOWN: 'RIGHT_DOWN',
  
  // Zoom
  ZOOM_IN: 'ZOOM_IN',
  ZOOM_OUT: 'ZOOM_OUT',
  
  // Focus
  FOCUS_NEAR: 'FOCUS_NEAR',
  FOCUS_FAR: 'FOCUS_FAR',
  
  // Iris
  IRIS_ENLARGE: 'IRIS_ENLARGE',
  IRIS_REDUCE: 'IRIS_REDUCE',
  
  // Special
  STOP: 'STOP',
  AUTO: 'AUTO',
  PRESET_GOTO: 'GOTO_PRESET',
  PRESET_SET: 'SET_PRESET'
};

// Event Types
export const HIKVISION_EVENT_TYPES = {
  // Motion Detection
  MOTION_DETECTION: 131073,
  VIDEO_LOSS: 131074,
  VIDEO_TAMPERING: 131075,
  
  // Access Control
  DOOR_OPEN: 196609,
  DOOR_CLOSE: 196610,
  DOOR_ABNORMAL: 196611,
  
  // Alarms
  ALARM_IN: 262145,
  ALARM_OUT: 262146,
  
  // System
  DEVICE_ONLINE: 327681,
  DEVICE_OFFLINE: 327682,
  STORAGE_ERROR: 327683,
  
  // Intelligent Events
  LINE_CROSSING: 393217,
  INTRUSION: 393218,
  REGION_ENTRANCE: 393219,
  REGION_EXIT: 393220,
  LOITERING: 393221,
  PEOPLE_GATHERING: 393222,
  FAST_MOVING: 393223,
  PARKING: 393224,
  UNATTENDED_BAGGAGE: 393225,
  OBJECT_REMOVAL: 393226
};

// Error Codes
export const HIKVISION_ERROR_CODES = {
  '0': 'Success',
  '1': 'General error',
  '2': 'Invalid parameters',
  '3': 'Not supported',
  '4': 'Low memory',
  '7': 'No permission',
  '12': 'Timeout',
  '17': 'Database error',
  '20': 'Device offline',
  '22': 'Device busy',
  '29': 'Device error',
  '41': 'Invalid session',
  '43': 'Buffer too small',
  '44': 'Not initialized',
  '101': 'Invalid username or password',
  '102': 'User locked',
  '103': 'Invalid signature',
  '400': 'Bad request',
  '401': 'Unauthorized',
  '403': 'Forbidden',
  '404': 'Not found',
  '500': 'Internal server error',
  '503': 'Service unavailable'
};