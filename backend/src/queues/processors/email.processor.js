/**
 * Email Notification Processor
 * Handles email notifications with Nodemailer and HTML templates
 */

const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;

// Email configuration
const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
};

// Create transporter
let transporter = null;

/**
 * Initialize email transporter
 */
async function initializeTransporter() {
  try {
    if (!EMAIL_CONFIG.auth.user || !EMAIL_CONFIG.auth.pass) {
      console.warn('⚠️  Email credentials not configured, email notifications will be simulated');
      return null;
    }

    transporter = nodemailer.createTransporter(EMAIL_CONFIG);
    
    // Verify connection
    await transporter.verify();
    console.log('✅ Email transporter initialized successfully');
    
    return transporter;
  } catch (error) {
    console.error('❌ Failed to initialize email transporter:', error.message);
    return null;
  }
}

/**
 * Email templates
 */
const EMAIL_TEMPLATES = {
  security_alert: {
    subject: '🚨 FORTEN Security Alert',
    getContent: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">🚨 Security Alert</h1>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #dc2626; margin-top: 0;">Alert Details</h2>
          <p><strong>Type:</strong> ${data.type || 'Security Incident'}</p>
          <p><strong>Building:</strong> ${data.buildingName || 'Unknown'}</p>
          <p><strong>Time:</strong> ${new Date(data.timestamp || Date.now()).toLocaleString()}</p>
          <p><strong>Description:</strong> ${data.description || 'Security alert triggered'}</p>
          
          ${data.location ? `<p><strong>Location:</strong> ${data.location}</p>` : ''}
          ${data.deviceId ? `<p><strong>Device:</strong> ${data.deviceId}</p>` : ''}
          
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #991b1b;"><strong>Action Required:</strong> Please review this security alert immediately and take appropriate action.</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL}/security/alerts" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View in Dashboard</a>
          </div>
        </div>
      </div>
    `
  },
  
  access_granted: {
    subject: '✅ FORTEN Access Granted',
    getContent: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #059669; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">✅ Access Granted</h1>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #059669; margin-top: 0;">Access Details</h2>
          <p><strong>User:</strong> ${data.userName || 'Unknown User'}</p>
          <p><strong>Building:</strong> ${data.buildingName || 'Unknown'}</p>
          <p><strong>Entry Point:</strong> ${data.entryPoint || 'Main Entrance'}</p>
          <p><strong>Time:</strong> ${new Date(data.timestamp || Date.now()).toLocaleString()}</p>
          <p><strong>Method:</strong> ${data.method || 'Unknown'}</p>
          
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #166534;">Access has been successfully granted and logged in the system.</p>
          </div>
        </div>
      </div>
    `
  },
  
  access_denied: {
    subject: '🚫 FORTEN Access Denied',
    getContent: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">🚫 Access Denied</h1>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #dc2626; margin-top: 0;">Access Attempt Details</h2>
          <p><strong>User:</strong> ${data.userName || 'Unknown User'}</p>
          <p><strong>Building:</strong> ${data.buildingName || 'Unknown'}</p>
          <p><strong>Entry Point:</strong> ${data.entryPoint || 'Main Entrance'}</p>
          <p><strong>Time:</strong> ${new Date(data.timestamp || Date.now()).toLocaleString()}</p>
          <p><strong>Reason:</strong> ${data.reason || 'Access denied'}</p>
          
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #991b1b;"><strong>Security Notice:</strong> An unauthorized access attempt has been detected and blocked.</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL}/security/access-logs" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Access Logs</a>
          </div>
        </div>
      </div>
    `
  },
  
  system_event: {
    subject: '📊 FORTEN System Event',
    getContent: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">📊 System Event</h1>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #2563eb; margin-top: 0;">Event Details</h2>
          <p><strong>Event:</strong> ${data.event || 'System Event'}</p>
          <p><strong>Severity:</strong> ${data.severity || 'Medium'}</p>
          <p><strong>Time:</strong> ${new Date(data.timestamp || Date.now()).toLocaleString()}</p>
          <p><strong>Description:</strong> ${data.description || 'System event occurred'}</p>
          
          ${data.affectedServices ? `<p><strong>Affected Services:</strong> ${data.affectedServices.join(', ')}</p>` : ''}
          
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #1e40af;">This system event has been logged for monitoring and maintenance purposes.</p>
          </div>
        </div>
      </div>
    `
  },
  
  device_status: {
    subject: '🔧 FORTEN Device Status Update',
    getContent: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${data.status === 'offline' ? '#dc2626' : '#059669'}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">🔧 Device Status Update</h1>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: ${data.status === 'offline' ? '#dc2626' : '#059669'}; margin-top: 0;">Device Information</h2>
          <p><strong>Device:</strong> ${data.deviceName || data.deviceId || 'Unknown Device'}</p>
          <p><strong>Type:</strong> ${data.deviceType || 'Unknown'}</p>
          <p><strong>Status:</strong> ${data.status || 'Unknown'}</p>
          <p><strong>Location:</strong> ${data.location || 'Unknown'}</p>
          <p><strong>Last Seen:</strong> ${new Date(data.lastSeen || Date.now()).toLocaleString()}</p>
          
          <div style="background: ${data.status === 'offline' ? '#fef2f2' : '#f0fdf4'}; border: 1px solid ${data.status === 'offline' ? '#fecaca' : '#bbf7d0'}; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: ${data.status === 'offline' ? '#991b1b' : '#166534'};">
              ${data.status === 'offline' ? 'Device is currently offline. Please check the device connection.' : 'Device is operating normally.'}
            </p>
          </div>
        </div>
      </div>
    `
  },
  
  maintenance: {
    subject: '🔧 FORTEN Maintenance Notification',
    getContent: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #d97706; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">🔧 Maintenance Notification</h1>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #d97706; margin-top: 0;">Maintenance Details</h2>
          <p><strong>Type:</strong> ${data.type || 'System Maintenance'}</p>
          <p><strong>Scheduled Time:</strong> ${new Date(data.scheduleTime || Date.now()).toLocaleString()}</p>
          <p><strong>Duration:</strong> ${data.duration || 'TBD'}</p>
          <p><strong>Affected Systems:</strong> ${data.affectedSystems ? data.affectedSystems.join(', ') : 'TBD'}</p>
          <p><strong>Description:</strong> ${data.description || 'Scheduled maintenance'}</p>
          
          <div style="background: #fffbeb; border: 1px solid #fed7aa; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e;">Please plan accordingly as some services may be temporarily unavailable during maintenance.</p>
          </div>
        </div>
      </div>
    `
  }
};

/**
 * Process email notification
 */
async function processEmailNotification(job) {
  try {
    const { data } = job;
    console.log(`📧 Processing email notification: ${data.type}`);
    
    // Update job progress
    job.progress(10);
    
    // Get email template
    const template = EMAIL_TEMPLATES[data.type];
    if (!template) {
      throw new Error(`No email template found for type: ${data.type}`);
    }
    
    job.progress(30);
    
    // Prepare recipients
    let recipients = [];
    if (data.recipients && data.recipients.length > 0) {
      recipients = data.recipients.filter(r => r.email);
    } else {
      // Default recipients based on notification type
      recipients = await getDefaultRecipients(data.type);
    }
    
    if (recipients.length === 0) {
      console.warn(`⚠️  No recipients found for email notification: ${data.type}`);
      return { status: 'skipped', reason: 'No recipients' };
    }
    
    job.progress(50);
    
    // Prepare email content
    const subject = template.subject;
    const htmlContent = template.getContent(data.data);
    const textContent = stripHtml(htmlContent);
    
    job.progress(70);
    
    // Send emails
    const results = [];
    
    if (!transporter) {
      // Simulate email sending if transporter is not available
      console.log(`📧 [SIMULATED] Email sent - Subject: ${subject}, Recipients: ${recipients.length}`);
      results.push({
        status: 'simulated',
        recipients: recipients.length,
        subject: subject
      });
    } else {
      // Send actual emails
      for (const recipient of recipients) {
        try {
          const emailOptions = {
            from: `"FORTEN Security" <${EMAIL_CONFIG.auth.user}>`,
            to: recipient.email,
            subject: subject,
            text: textContent,
            html: htmlContent,
            headers: {
              'X-Notification-Type': data.type,
              'X-Notification-ID': data.id,
              'X-Priority': data.priority === 1 ? 'High' : 'Normal'
            }
          };
          
          const info = await transporter.sendMail(emailOptions);
          results.push({
            recipient: recipient.email,
            messageId: info.messageId,
            status: 'sent'
          });
          
          console.log(`✅ Email sent to ${recipient.email}: ${info.messageId}`);
        } catch (error) {
          console.error(`❌ Failed to send email to ${recipient.email}:`, error.message);
          results.push({
            recipient: recipient.email,
            status: 'failed',
            error: error.message
          });
        }
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
    console.error('❌ Email processor error:', error);
    throw error;
  }
}

/**
 * Get default recipients based on notification type
 */
async function getDefaultRecipients(type) {
  // In a real implementation, this would query the database for users
  // based on their roles and notification preferences
  const defaultRecipients = [
    { email: 'admin@forten.com.uy', role: 'admin' },
    { email: 'security@forten.com.uy', role: 'security' }
  ];
  
  switch (type) {
    case 'security_alert':
    case 'access_denied':
      return defaultRecipients.filter(r => ['admin', 'security'].includes(r.role));
    case 'access_granted':
      return defaultRecipients.filter(r => r.role === 'admin');
    case 'system_event':
    case 'device_status':
      return defaultRecipients.filter(r => ['admin', 'operator'].includes(r.role));
    case 'maintenance':
      return defaultRecipients;
    default:
      return [];
  }
}

/**
 * Strip HTML tags for text content
 */
function stripHtml(html) {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Test email configuration
 */
async function testEmailConfig() {
  try {
    if (!transporter) {
      await initializeTransporter();
    }
    
    if (!transporter) {
      return { status: 'error', message: 'Email transporter not initialized' };
    }
    
    const testEmail = {
      from: `"FORTEN Test" <${EMAIL_CONFIG.auth.user}>`,
      to: EMAIL_CONFIG.auth.user,
      subject: 'FORTEN Email Test',
      text: 'This is a test email from FORTEN notification system.',
      html: '<p>This is a test email from <strong>FORTEN</strong> notification system.</p>'
    };
    
    const info = await transporter.sendMail(testEmail);
    
    return {
      status: 'success',
      messageId: info.messageId,
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

// Initialize transporter on module load
initializeTransporter();

module.exports = {
  processEmailNotification,
  testEmailConfig,
  initializeTransporter,
  EMAIL_TEMPLATES
};