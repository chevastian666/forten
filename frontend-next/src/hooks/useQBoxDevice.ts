/**
 * Q-Box Device Hook
 * React hook for managing Q-Box devices
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { qboxDeviceService, QBoxDevice, QBoxCommand, QBoxResponse } from '@/services/qbox';
import { toast } from 'sonner';

interface UseQBoxDeviceOptions {
  buildingId?: string;
  deviceId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useQBoxDevice(options: UseQBoxDeviceOptions = {}) {
  const queryClient = useQueryClient();
  const { buildingId, deviceId, autoRefresh = true, refreshInterval = 30000 } = options;
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');

  // Initialize Q-Box service
  useEffect(() => {
    const initializeService = async () => {
      try {
        await qboxDeviceService.initialize();
        setIsInitialized(true);
        setConnectionStatus('connected');
      } catch (error) {
        console.error('Failed to initialize Q-Box service:', error);
        setConnectionStatus('disconnected');
        toast.error('Failed to connect to Q-Box service');
      }
    };

    if (!isInitialized) {
      initializeService();
    }

    return () => {
      if (isInitialized) {
        qboxDeviceService.cleanup();
        setIsInitialized(false);
      }
    };
  }, [isInitialized]);

  // Get all devices
  const { data: devices = [], isLoading: devicesLoading, error: devicesError } = useQuery({
    queryKey: ['qbox-devices', buildingId],
    queryFn: () => {
      if (buildingId) {
        return qboxDeviceService.getDevicesByBuilding(buildingId);
      }
      return qboxDeviceService.getDevices();
    },
    enabled: isInitialized,
    refetchInterval: autoRefresh ? refreshInterval : false,
    staleTime: 10000
  });

  // Get single device
  const { data: device, isLoading: deviceLoading, error: deviceError } = useQuery({
    queryKey: ['qbox-device', deviceId],
    queryFn: () => {
      if (!deviceId) return null;
      return qboxDeviceService.getDevice(deviceId) || null;
    },
    enabled: isInitialized && !!deviceId,
    refetchInterval: autoRefresh ? refreshInterval : false
  });

  // Register device mutation
  const registerDeviceMutation = useMutation({
    mutationFn: (params: Parameters<typeof qboxDeviceService.registerDevice>[0]) => 
      qboxDeviceService.registerDevice(params),
    onSuccess: (newDevice) => {
      queryClient.invalidateQueries({ queryKey: ['qbox-devices'] });
      toast.success('Device registered successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to register device: ${error.message}`);
    }
  });

  // Update device config mutation
  const updateConfigMutation = useMutation({
    mutationFn: ({ deviceId, config }: { deviceId: string; config: Partial<QBoxDevice['config']> }) =>
      qboxDeviceService.updateDeviceConfig(deviceId, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qbox-devices'] });
      queryClient.invalidateQueries({ queryKey: ['qbox-device', deviceId] });
      toast.success('Device configuration updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update configuration: ${error.message}`);
    }
  });

  // Send command mutation
  const sendCommandMutation = useMutation({
    mutationFn: (command: QBoxCommand) => qboxDeviceService.sendCommand(command),
    onSuccess: (response: QBoxResponse, variables) => {
      if (response.success) {
        toast.success(`Command ${variables.command} executed successfully`);
      } else {
        toast.error(`Command failed: ${response.message || 'Unknown error'}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Command error: ${error.message}`);
    }
  });

  // Grant access mutation
  const grantAccessMutation = useMutation({
    mutationFn: qboxDeviceService.grantAccess.bind(qboxDeviceService),
    onSuccess: (response) => {
      if (response.success) {
        toast.success('Access granted');
      } else {
        toast.error(`Access denied: ${response.message || 'Unknown error'}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Access error: ${error.message}`);
    }
  });

  // Device actions
  const openDoor = useCallback(
    async (deviceId: string, duration?: number) => {
      const response = await qboxDeviceService.openDoor(deviceId, duration);
      if (response.success) {
        toast.success('Door opened');
      } else {
        toast.error(`Failed to open door: ${response.message || 'Unknown error'}`);
      }
      return response;
    },
    []
  );

  const restartDevice = useCallback(
    async (deviceId: string) => {
      const response = await qboxDeviceService.restartDevice(deviceId);
      if (response.success) {
        toast.success('Device restart initiated');
      } else {
        toast.error(`Failed to restart device: ${response.message || 'Unknown error'}`);
      }
      return response;
    },
    []
  );

  const takeSnapshot = useCallback(
    async (deviceId: string) => {
      const imageUrl = await qboxDeviceService.takeSnapshot(deviceId);
      if (imageUrl) {
        toast.success('Snapshot captured');
        return imageUrl;
      } else {
        toast.error('Failed to capture snapshot');
        return null;
      }
    },
    []
  );

  const displayMessage = useCallback(
    async (deviceId: string, message: string, duration?: number) => {
      const response = await qboxDeviceService.displayMessage(deviceId, message, duration);
      if (response.success) {
        toast.success('Message displayed');
      } else {
        toast.error(`Failed to display message: ${response.message || 'Unknown error'}`);
      }
      return response;
    },
    []
  );

  const playSound = useCallback(
    async (deviceId: string, soundFile: string) => {
      const response = await qboxDeviceService.playSound(deviceId, soundFile);
      if (response.success) {
        toast.success('Sound played');
      } else {
        toast.error(`Failed to play sound: ${response.message || 'Unknown error'}`);
      }
      return response;
    },
    []
  );

  const emergencyOpenAll = useCallback(
    async (buildingId: string) => {
      try {
        await qboxDeviceService.emergencyOpenAll(buildingId);
        toast.success('Emergency open initiated for all doors');
      } catch (error) {
        toast.error('Failed to execute emergency open');
        throw error;
      }
    },
    []
  );

  // Get device logs
  const getDeviceLogs = useCallback(
    async (deviceId: string, limit?: number) => {
      try {
        const logs = await qboxDeviceService.getDeviceLogs(deviceId, limit);
        return logs;
      } catch (error) {
        toast.error('Failed to fetch device logs');
        return [];
      }
    },
    []
  );

  return {
    // State
    isInitialized,
    connectionStatus,
    devices,
    device,
    isLoading: devicesLoading || deviceLoading,
    error: devicesError || deviceError,

    // Mutations
    registerDevice: registerDeviceMutation.mutate,
    updateConfig: updateConfigMutation.mutate,
    sendCommand: sendCommandMutation.mutate,
    grantAccess: grantAccessMutation.mutate,

    // Actions
    openDoor,
    restartDevice,
    takeSnapshot,
    displayMessage,
    playSound,
    emergencyOpenAll,
    getDeviceLogs,

    // Loading states
    isRegistering: registerDeviceMutation.isPending,
    isUpdatingConfig: updateConfigMutation.isPending,
    isSendingCommand: sendCommandMutation.isPending,
    isGrantingAccess: grantAccessMutation.isPending
  };
}