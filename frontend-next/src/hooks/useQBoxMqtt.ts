/**
 * Q-Box MQTT Hook
 * React hook for Q-Box real-time MQTT events
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { qboxMqttService } from '@/services/qbox';

interface UseQBoxMqttOptions {
  onDeviceStatus?: (status: any) => void;
  onDeviceEvent?: (event: any) => void;
  onAccessRequest?: (request: any) => void;
  onAccessGranted?: (event: any) => void;
  onAccessDenied?: (event: any) => void;
  onPinEntered?: (event: any) => void;
  onSystemBroadcast?: (broadcast: any) => void;
  autoConnect?: boolean;
}

export function useQBoxMqtt(options: UseQBoxMqttOptions = {}) {
  const {
    onDeviceStatus,
    onDeviceEvent,
    onAccessRequest,
    onAccessGranted,
    onAccessDenied,
    onPinEntered,
    onSystemBroadcast,
    autoConnect = true
  } = options;

  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting' | 'reconnecting'>('disconnected');
  const [subscribedTopics, setSubscribedTopics] = useState<string[]>([]);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastEvent, setLastEvent] = useState<any>(null);
  
  const listenersRef = useRef<Array<() => void>>([]);

  // Connect to MQTT
  const connect = useCallback(async () => {
    if (qboxMqttService.isConnected()) {
      setConnectionStatus('connected');
      return;
    }

    setConnectionStatus('connecting');
    
    try {
      await qboxMqttService.connect();
      setConnectionStatus('connected');
      setReconnectAttempts(0);
    } catch (error) {
      console.error('MQTT connection failed:', error);
      setConnectionStatus('disconnected');
    }
  }, []);

  // Disconnect from MQTT
  const disconnect = useCallback(() => {
    qboxMqttService.disconnect();
    setConnectionStatus('disconnected');
    setSubscribedTopics([]);
  }, []);

  // Subscribe to topic
  const subscribe = useCallback((topic: string) => {
    qboxMqttService.subscribe(topic);
    setSubscribedTopics(prev => [...new Set([...prev, topic])]);
  }, []);

  // Unsubscribe from topic
  const unsubscribe = useCallback((topic: string) => {
    qboxMqttService.unsubscribe(topic);
    setSubscribedTopics(prev => prev.filter(t => t !== topic));
  }, []);

  // Publish message
  const publish = useCallback((topic: string, message: any) => {
    qboxMqttService.publish(topic, message);
  }, []);

  // Send command to device
  const sendCommand = useCallback((deviceId: string, command: string, params?: any) => {
    qboxMqttService.sendCommand(deviceId, command, params);
  }, []);

  // Setup event listeners
  useEffect(() => {
    const listeners: Array<() => void> = [];

    // Connection events
    const onConnected = () => {
      setConnectionStatus('connected');
      setSubscribedTopics(qboxMqttService.getSubscribedTopics());
    };
    const onDisconnected = () => setConnectionStatus('disconnected');
    const onReconnecting = (attempts: number) => {
      setConnectionStatus('reconnecting');
      setReconnectAttempts(attempts);
    };
    const onError = (error: Error) => console.error('MQTT error:', error);

    qboxMqttService.on('connected', onConnected);
    qboxMqttService.on('disconnected', onDisconnected);
    qboxMqttService.on('reconnecting', onReconnecting);
    qboxMqttService.on('error', onError);

    listeners.push(
      () => qboxMqttService.off('connected', onConnected),
      () => qboxMqttService.off('disconnected', onDisconnected),
      () => qboxMqttService.off('reconnecting', onReconnecting),
      () => qboxMqttService.off('error', onError)
    );

    // Device events
    if (onDeviceStatus) {
      qboxMqttService.on('deviceStatus', onDeviceStatus);
      listeners.push(() => qboxMqttService.off('deviceStatus', onDeviceStatus));
    }

    if (onDeviceEvent) {
      const handler = (event: any) => {
        setLastEvent(event);
        onDeviceEvent(event);
      };
      qboxMqttService.on('deviceEvent', handler);
      listeners.push(() => qboxMqttService.off('deviceEvent', handler));
    }

    // Access events
    if (onAccessRequest) {
      qboxMqttService.on('accessRequest', onAccessRequest);
      listeners.push(() => qboxMqttService.off('accessRequest', onAccessRequest));
    }

    if (onAccessGranted) {
      qboxMqttService.on('accessGranted', onAccessGranted);
      listeners.push(() => qboxMqttService.off('accessGranted', onAccessGranted));
    }

    if (onAccessDenied) {
      qboxMqttService.on('accessDenied', onAccessDenied);
      listeners.push(() => qboxMqttService.off('accessDenied', onAccessDenied));
    }

    // PIN events
    if (onPinEntered) {
      qboxMqttService.on('pinEntered', onPinEntered);
      listeners.push(() => qboxMqttService.off('pinEntered', onPinEntered));
    }

    // System events
    if (onSystemBroadcast) {
      qboxMqttService.on('systemBroadcast', onSystemBroadcast);
      listeners.push(() => qboxMqttService.off('systemBroadcast', onSystemBroadcast));
    }

    listenersRef.current = listeners;

    return () => {
      listeners.forEach(cleanup => cleanup());
    };
  }, [
    onDeviceStatus,
    onDeviceEvent,
    onAccessRequest,
    onAccessGranted,
    onAccessDenied,
    onPinEntered,
    onSystemBroadcast
  ]);

  // Auto-connect effect
  useEffect(() => {
    if (autoConnect && !qboxMqttService.isConnected()) {
      connect();
    }
  }, [autoConnect, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      listenersRef.current.forEach(cleanup => cleanup());
    };
  }, []);

  // Get device statuses
  const getDeviceStatuses = useCallback(() => {
    return qboxMqttService.getAllDeviceStatuses();
  }, []);

  // Get specific device status
  const getDeviceStatus = useCallback((deviceId: string) => {
    return qboxMqttService.getDeviceStatus(deviceId);
  }, []);

  return {
    // Connection
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    reconnectAttempts,
    connect,
    disconnect,

    // Topics
    subscribedTopics,
    subscribe,
    unsubscribe,

    // Messaging
    publish,
    sendCommand,

    // Device status
    getDeviceStatuses,
    getDeviceStatus,

    // Last event
    lastEvent
  };
}