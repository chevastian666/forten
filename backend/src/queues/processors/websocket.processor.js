/**
 * WebSocket Notification Processor
 * Handles real-time notifications via WebSocket connections with building rooms support
 */

/**
 * Process WebSocket notification
 */
async function processWebSocketNotification(job) {
  try {
    const { data } = job;
    console.log(`🔌 Processing WebSocket notification: ${data.type}`);
    
    // Update job progress
    job.progress(10);
    
    // Get Socket.IO instance and building rooms manager
    const io = job.opts.io || global.io;
    const buildingRoomsManager = job.opts.buildingRoomsManager || global.buildingRoomsManager;
    
    if (!io) {
      throw new Error('Socket.IO instance not available');
    }
    
    job.progress(30);
    
    // Prepare notification payload
    const notification = {
      id: data.id,
      type: data.type,
      title: getNotificationTitle(data.type),
      message: getNotificationMessage(data.type, data.data),
      data: data.data,
      priority: data.priority,
      timestamp: data.timestamp,
      metadata: data.metadata || {}
    };
    
    job.progress(50);
    
    // Determine target rooms/users
    const targets = await getNotificationTargets(data);
    
    job.progress(70);
    
    // Send to different targets
    const results = [];
    
    for (const target of targets) {
      try {
        switch (target.type) {
          case 'room':
            io.to(target.id).emit('notification', notification);
            results.push({
              type: 'room',
              target: target.id,
              status: 'sent'
            });
            console.log(`📡 Notification sent to room: ${target.id}`);
            break;
            
          case 'user':
            io.to(`user_${target.id}`).emit('notification', notification);
            results.push({
              type: 'user',
              target: target.id,
              status: 'sent'
            });
            console.log(`📡 Notification sent to user: ${target.id}`);
            break;
            
          case 'broadcast':
            io.emit('notification', notification);
            results.push({
              type: 'broadcast',
              target: 'all',
              status: 'sent'
            });
            console.log(`📡 Notification broadcasted to all users`);
            break;
            
          case 'building':
            // Use building rooms manager if available
            if (buildingRoomsManager) {
              await buildingRoomsManager.sendNotificationToBuilding(target.id, notification);
            } else {
              // Fallback to direct room emission
              io.to(`building_${target.id}`).emit('notification', notification);
            }
            results.push({
              type: 'building',
              target: target.id,
              status: 'sent'
            });
            console.log(`📡 Notification sent to building: ${target.id}`);
            break;
            
          default:
            console.warn(`⚠️  Unknown target type: ${target.type}`);
        }
      } catch (error) {
        console.error(`❌ Failed to send to ${target.type} ${target.id}:`, error.message);
        results.push({
          type: target.type,
          target: target.id,
          status: 'failed',
          error: error.message
        });
      }
    }
    
    // Send specific notification types to dashboard
    if (['security_alert', 'access_denied', 'device_status'].includes(data.type)) {
      io.to('dashboard').emit('dashboard_update', {
        type: 'notification',
        notification: notification,
        timestamp: new Date().toISOString()
      });
      
      results.push({
        type: 'dashboard',
        target: 'dashboard',
        status: 'sent'
      });
    }
    
    // Update metrics in real-time for certain events
    if (['access_granted', 'access_denied'].includes(data.type)) {
      io.to('metrics').emit('metrics_update', {
        type: 'access_event',
        event: data.data,
        timestamp: new Date().toISOString()
      });
    }
    
    job.progress(100);
    
    return {
      status: 'completed',
      type: data.type,
      targets: targets.length,
      results: results,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ WebSocket processor error:', error);
    throw error;
  }
}

/**
 * Get notification title based on type
 */
function getNotificationTitle(type) {
  const titles = {
    security_alert: '🚨 Security Alert',
    access_granted: '✅ Access Granted',
    access_denied: '🚫 Access Denied',
    system_event: '📊 System Event',
    user_activity: '👤 User Activity',
    device_status: '🔧 Device Status',
    maintenance: '🔧 Maintenance Notice',
    report_generated: '📄 Report Ready'
  };
  
  return titles[type] || '📢 Notification';
}

/**
 * Get notification message based on type and data
 */
function getNotificationMessage(type, data) {
  switch (type) {
    case 'security_alert':
      return `Security alert in ${data.buildingName || 'building'}: ${data.description || 'Security incident detected'}`;
      
    case 'access_granted':
      return `Access granted to ${data.userName || 'user'} at ${data.buildingName || 'building'}`;
      
    case 'access_denied':
      return `Access denied for ${data.userName || 'user'} at ${data.buildingName || 'building'}: ${data.reason || 'Unauthorized'}`;
      
    case 'system_event':
      return `System event: ${data.event || 'Event occurred'} - ${data.description || 'Check system status'}`;
      
    case 'user_activity':
      return `User activity: ${data.activity || 'Activity detected'} by ${data.userName || 'user'}`;
      
    case 'device_status':
      return `Device ${data.deviceName || data.deviceId || 'device'} is now ${data.status || 'status changed'}`;
      
    case 'maintenance':
      return `Maintenance scheduled: ${data.type || 'System maintenance'} at ${new Date(data.scheduleTime || Date.now()).toLocaleString()}`;
      
    case 'report_generated':
      return `Report "${data.reportName || 'Report'}" has been generated and is ready for download`;
      
    default:
      return `Notification: ${data.description || 'New notification received'}`;
  }
}

/**
 * Get notification targets based on data and type
 */
async function getNotificationTargets(data) {
  const targets = [];
  
  // If specific recipients are provided
  if (data.recipients && data.recipients.length > 0) {
    data.recipients.forEach(recipient => {
      if (recipient.userId) {
        targets.push({ type: 'user', id: recipient.userId });
      }
    });
  }
  
  // Default targeting based on notification type
  switch (data.type) {
    case 'security_alert':
      // Send to security team and admins
      targets.push(
        { type: 'room', id: 'security_team' },
        { type: 'room', id: 'admins' }
      );
      
      // If building-specific, also send to building operators
      if (data.data.buildingId) {
        targets.push({ type: 'building', id: data.data.buildingId });
      }
      break;
      
    case 'access_granted':
    case 'access_denied':
      // Send to building-specific room and security
      if (data.data.buildingId) {
        targets.push({ type: 'building', id: data.data.buildingId });
      }
      targets.push({ type: 'room', id: 'security_team' });
      break;
      
    case 'system_event':
      // Send to admins and operators
      targets.push(
        { type: 'room', id: 'admins' },
        { type: 'room', id: 'operators' }
      );
      break;
      
    case 'user_activity':
      // Send to user and admins
      if (data.data.userId) {
        targets.push({ type: 'user', id: data.data.userId });
      }
      targets.push({ type: 'room', id: 'admins' });
      break;
      
    case 'device_status':
      // Send to technical team and building operators
      targets.push({ type: 'room', id: 'technical_team' });
      if (data.data.buildingId) {
        targets.push({ type: 'building', id: data.data.buildingId });
      }
      break;
      
    case 'maintenance':
      // Broadcast to all users
      targets.push({ type: 'broadcast', id: 'all' });
      break;
      
    case 'report_generated':
      // Send to user who requested the report
      if (data.data.requestedBy) {
        targets.push({ type: 'user', id: data.data.requestedBy });
      }
      targets.push({ type: 'room', id: 'admins' });
      break;
      
    default:
      // Default to admins
      targets.push({ type: 'room', id: 'admins' });
  }
  
  // Remove duplicates
  const uniqueTargets = targets.filter((target, index, self) => 
    index === self.findIndex(t => t.type === target.type && t.id === target.id)
  );
  
  return uniqueTargets;
}

/**
 * Send real-time update to dashboard
 */
async function sendDashboardUpdate(io, updateType, data) {
  try {
    const update = {
      type: updateType,
      data: data,
      timestamp: new Date().toISOString()
    };
    
    io.to('dashboard').emit('dashboard_update', update);
    console.log(`📊 Dashboard update sent: ${updateType}`);
    
    return { status: 'sent', type: updateType };
  } catch (error) {
    console.error('❌ Failed to send dashboard update:', error);
    throw error;
  }
}

/**
 * Send metrics update
 */
async function sendMetricsUpdate(io, event) {
  try {
    const update = {
      event: event,
      timestamp: new Date().toISOString()
    };
    
    io.to('metrics').emit('metrics_update', update);
    console.log(`📈 Metrics update sent for event: ${event.type}`);
    
    return { status: 'sent', event: event.type };
  } catch (error) {
    console.error('❌ Failed to send metrics update:', error);
    throw error;
  }
}

/**
 * Test WebSocket connection
 */
async function testWebSocketConnection(io) {
  try {
    if (!io) {
      return { status: 'error', message: 'Socket.IO instance not available' };
    }
    
    const testNotification = {
      id: require('uuid').v4(),
      type: 'system_test',
      title: '🧪 WebSocket Test',
      message: 'This is a test notification from FORTEN WebSocket system',
      timestamp: new Date().toISOString(),
      data: {
        test: true,
        timestamp: Date.now()
      }
    };
    
    // Send test notification to admins
    io.to('admins').emit('notification', testNotification);
    
    return {
      status: 'success',
      message: 'Test notification sent',
      notificationId: testNotification.id,
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
 * Get connected clients count
 */
function getConnectedClientsCount(io) {
  try {
    if (!io) {
      return { error: 'Socket.IO instance not available' };
    }
    
    const sockets = io.sockets.sockets;
    const rooms = io.sockets.adapter.rooms;
    
    return {
      totalClients: sockets.size,
      rooms: Array.from(rooms.keys()).map(roomName => ({
        name: roomName,
        clients: rooms.get(roomName)?.size || 0
      })),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  processWebSocketNotification,
  sendDashboardUpdate,
  sendMetricsUpdate,
  testWebSocketConnection,
  getConnectedClientsCount,
  getNotificationTitle,
  getNotificationMessage,
  getNotificationTargets
};