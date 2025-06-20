/**
 * WhatsApp Notification Processor
 * Handles WhatsApp Business API notifications (future implementation)
 */

/**
 * Process WhatsApp notification
 */
async function processWhatsAppNotification(job) {
  try {
    const { data } = job;
    console.log(`📱 Processing WhatsApp notification: ${data.type}`);
    
    // Update job progress
    job.progress(10);
    
    // Check if WhatsApp integration is configured
    const whatsappConfig = {
      apiUrl: process.env.WHATSAPP_API_URL,
      apiToken: process.env.WHATSAPP_API_TOKEN,
      businessNumber: process.env.WHATSAPP_BUSINESS_NUMBER
    };
    
    if (!whatsappConfig.apiUrl || !whatsappConfig.apiToken) {
      console.warn('⚠️  WhatsApp API not configured, simulating message send');
      return simulateWhatsAppSend(data);
    }
    
    job.progress(30);
    
    // Prepare recipients with phone numbers
    const recipients = await getWhatsAppRecipients(data);
    
    if (recipients.length === 0) {
      console.warn(`⚠️  No WhatsApp recipients found for notification: ${data.type}`);
      return { status: 'skipped', reason: 'No recipients with phone numbers' };
    }
    
    job.progress(50);
    
    // Prepare message content
    const message = await prepareWhatsAppMessage(data);
    
    job.progress(70);
    
    // Send WhatsApp messages
    const results = [];
    
    for (const recipient of recipients) {
      try {
        const result = await sendWhatsAppMessage(recipient.phone, message, whatsappConfig);
        results.push({
          recipient: recipient.phone,
          status: 'sent',
          messageId: result.messageId
        });
        
        console.log(`✅ WhatsApp sent to ${recipient.phone}: ${result.messageId}`);
      } catch (error) {
        console.error(`❌ Failed to send WhatsApp to ${recipient.phone}:`, error.message);
        results.push({
          recipient: recipient.phone,
          status: 'failed',
          error: error.message
        });
      }
    }
    
    job.progress(100);
    
    return {
      status: 'completed',
      type: data.type,
      recipientCount: recipients.length,
      results: results,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ WhatsApp processor error:', error);
    throw error;
  }
}

/**
 * Simulate WhatsApp message sending (when API is not configured)
 */
function simulateWhatsAppSend(data) {
  const message = prepareWhatsAppMessageText(data);
  
  console.log(`📱 [SIMULATED] WhatsApp message for ${data.type}:`);
  console.log(`📱 [SIMULATED] Message: ${message}`);
  
  return {
    status: 'simulated',
    type: data.type,
    message: message,
    timestamp: new Date().toISOString()
  };
}

/**
 * Get WhatsApp recipients based on notification data
 */
async function getWhatsAppRecipients(data) {
  // In a real implementation, this would query the database for users with phone numbers
  const recipients = [];
  
  // If specific recipients are provided
  if (data.recipients && data.recipients.length > 0) {
    data.recipients.forEach(recipient => {
      if (recipient.phone) {
        recipients.push({
          phone: recipient.phone,
          name: recipient.name || 'User'
        });
      }
    });
  }
  
  // Default recipients for certain notification types
  if (recipients.length === 0) {
    const defaultRecipients = await getDefaultWhatsAppRecipients(data.type);
    recipients.push(...defaultRecipients);
  }
  
  return recipients;
}

/**
 * Get default WhatsApp recipients based on notification type
 */
async function getDefaultWhatsAppRecipients(type) {
  // Mock recipients - in production, query from database
  const adminRecipients = [
    { phone: '+59899123456', name: 'Admin FORTEN' },
    { phone: '+59899654321', name: 'Security Manager' }
  ];
  
  switch (type) {
    case 'security_alert':
    case 'access_denied':
      return adminRecipients;
    case 'device_status':
      return adminRecipients.filter(r => r.name.includes('Security'));
    case 'maintenance':
      return adminRecipients;
    default:
      return [];
  }
}

/**
 * Prepare WhatsApp message content
 */
async function prepareWhatsAppMessage(data) {
  const message = {
    type: 'text',
    text: prepareWhatsAppMessageText(data)
  };
  
  // Add media for certain notification types
  if (data.type === 'security_alert' && data.data.imageUrl) {
    message.type = 'image';
    message.image = {
      url: data.data.imageUrl,
      caption: message.text
    };
  }
  
  return message;
}

/**
 * Prepare WhatsApp message text
 */
function prepareWhatsAppMessageText(data) {
  const timestamp = new Date(data.timestamp || Date.now()).toLocaleString('es-UY');
  
  switch (data.type) {
    case 'security_alert':
      return `🚨 *FORTEN ALERTA DE SEGURIDAD*\n\n` +
             `🏢 Edificio: ${data.data.buildingName || 'Desconocido'}\n` +
             `⏰ Hora: ${timestamp}\n` +
             `📝 Descripción: ${data.data.description || 'Alerta de seguridad detectada'}\n\n` +
             `⚠️ *Acción requerida inmediata*\n\n` +
             `🔗 Ver en dashboard: ${process.env.FRONTEND_URL}/security/alerts`;
             
    case 'access_denied':
      return `🚫 *ACCESO DENEGADO - FORTEN*\n\n` +
             `👤 Usuario: ${data.data.userName || 'Usuario desconocido'}\n` +
             `🏢 Edificio: ${data.data.buildingName || 'Desconocido'}\n` +
             `🚪 Punto de acceso: ${data.data.entryPoint || 'Entrada principal'}\n` +
             `⏰ Hora: ${timestamp}\n` +
             `❌ Motivo: ${data.data.reason || 'Acceso no autorizado'}\n\n` +
             `🔒 Intento de acceso bloqueado\n\n` +
             `🔗 Ver logs: ${process.env.FRONTEND_URL}/security/access-logs`;
             
    case 'access_granted':
      return `✅ *ACCESO CONCEDIDO - FORTEN*\n\n` +
             `👤 Usuario: ${data.data.userName || 'Usuario desconocido'}\n` +
             `🏢 Edificio: ${data.data.buildingName || 'Desconocido'}\n` +
             `🚪 Punto de acceso: ${data.data.entryPoint || 'Entrada principal'}\n` +
             `⏰ Hora: ${timestamp}\n` +
             `🔑 Método: ${data.data.method || 'Desconocido'}\n\n` +
             `✅ Acceso registrado exitosamente`;
             
    case 'device_status':
      const statusEmoji = data.data.status === 'offline' ? '🔴' : '🟢';
      const statusText = data.data.status === 'offline' ? 'DESCONECTADO' : 'CONECTADO';
      
      return `${statusEmoji} *ESTADO DE DISPOSITIVO - FORTEN*\n\n` +
             `🔧 Dispositivo: ${data.data.deviceName || data.data.deviceId || 'Dispositivo desconocido'}\n` +
             `📡 Estado: ${statusText}\n` +
             `📍 Ubicación: ${data.data.location || 'Desconocida'}\n` +
             `⏰ Última conexión: ${new Date(data.data.lastSeen || Date.now()).toLocaleString('es-UY')}\n\n` +
             `${data.data.status === 'offline' ? '⚠️ Verificar conexión del dispositivo' : '✅ Dispositivo funcionando correctamente'}`;
             
    case 'maintenance':
      return `🔧 *MANTENIMIENTO PROGRAMADO - FORTEN*\n\n` +
             `🛠️ Tipo: ${data.data.type || 'Mantenimiento del sistema'}\n` +
             `⏰ Fecha programada: ${new Date(data.data.scheduleTime || Date.now()).toLocaleString('es-UY')}\n` +
             `⏱️ Duración estimada: ${data.data.duration || 'Por determinar'}\n` +
             `🏢 Sistemas afectados: ${data.data.affectedSystems ? data.data.affectedSystems.join(', ') : 'Por determinar'}\n\n` +
             `📝 Descripción: ${data.data.description || 'Mantenimiento programado'}\n\n` +
             `ℹ️ Algunos servicios pueden no estar disponibles temporalmente`;
             
    case 'system_event':
      return `📊 *EVENTO DEL SISTEMA - FORTEN*\n\n` +
             `🔔 Evento: ${data.data.event || 'Evento del sistema'}\n` +
             `⚠️ Severidad: ${data.data.severity || 'Media'}\n` +
             `⏰ Hora: ${timestamp}\n` +
             `📝 Descripción: ${data.data.description || 'Evento del sistema ocurrido'}\n\n` +
             `ℹ️ Evento registrado para monitoreo`;
             
    default:
      return `📢 *NOTIFICACIÓN FORTEN*\n\n` +
             `📝 ${data.data.description || 'Nueva notificación recibida'}\n` +
             `⏰ Hora: ${timestamp}\n\n` +
             `🔗 Dashboard: ${process.env.FRONTEND_URL}`;
  }
}

/**
 * Send WhatsApp message via API
 */
async function sendWhatsAppMessage(phoneNumber, message, config) {
  try {
    // This is a placeholder for WhatsApp Business API integration
    // In a real implementation, you would use the official WhatsApp Business API
    
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneNumber,
      type: message.type,
      [message.type]: message.type === 'text' ? { body: message.text } : message[message.type]
    };
    
    // Simulate API call
    console.log(`📱 Sending WhatsApp message to ${phoneNumber}:`, payload);
    
    // In production, make actual HTTP request to WhatsApp API:
    /*
    const response = await fetch(`${config.apiUrl}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${result.error?.message || 'Unknown error'}`);
    }
    
    return {
      messageId: result.messages[0].id,
      status: 'sent'
    };
    */
    
    // Simulated response
    return {
      messageId: `wamid.${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'sent'
    };
    
  } catch (error) {
    console.error('❌ WhatsApp API error:', error);
    throw error;
  }
}

/**
 * Test WhatsApp configuration
 */
async function testWhatsAppConfig() {
  try {
    const config = {
      apiUrl: process.env.WHATSAPP_API_URL,
      apiToken: process.env.WHATSAPP_API_TOKEN,
      businessNumber: process.env.WHATSAPP_BUSINESS_NUMBER
    };
    
    if (!config.apiUrl || !config.apiToken) {
      return {
        status: 'not_configured',
        message: 'WhatsApp API credentials not configured',
        timestamp: new Date().toISOString()
      };
    }
    
    // Test message
    const testMessage = {
      type: 'text',
      text: '🧪 FORTEN - Mensaje de prueba del sistema de notificaciones WhatsApp'
    };
    
    // In production, send to a test number
    const testResult = await sendWhatsAppMessage('+59899999999', testMessage, config);
    
    return {
      status: 'success',
      messageId: testResult.messageId,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Validate phone number format
 */
function validatePhoneNumber(phone) {
  // Basic validation for Uruguayan phone numbers
  const phoneRegex = /^\+598[0-9]{8}$/;
  return phoneRegex.test(phone);
}

/**
 * Format phone number for WhatsApp
 */
function formatPhoneNumber(phone) {
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Add Uruguay country code if not present
  if (cleaned.startsWith('09')) {
    cleaned = '598' + cleaned;
  } else if (!cleaned.startsWith('598')) {
    cleaned = '598' + cleaned;
  }
  
  return '+' + cleaned;
}

module.exports = {
  processWhatsAppNotification,
  testWhatsAppConfig,
  validatePhoneNumber,
  formatPhoneNumber,
  prepareWhatsAppMessageText
};