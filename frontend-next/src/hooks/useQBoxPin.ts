/**
 * Q-Box PIN Hook
 * React hook for managing Q-Box PINs
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { qboxPinService, QBoxPin, PinGenerateRequest, PinValidationResult } from '@/services/qbox';
import { toast } from 'sonner';

interface UseQBoxPinOptions {
  buildingId?: string;
  residentId?: string;
  visitorId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useQBoxPin(options: UseQBoxPinOptions = {}) {
  const queryClient = useQueryClient();
  const { buildingId, residentId, visitorId, autoRefresh = false, refreshInterval = 60000 } = options;
  
  const [validationCache] = useState(new Map<string, { result: PinValidationResult; timestamp: number }>());

  // Get PINs
  const { data: pins = [], isLoading, error, refetch } = useQuery({
    queryKey: ['qbox-pins', buildingId, residentId, visitorId],
    queryFn: () => {
      if (!buildingId) return [];
      return qboxPinService.getPinsByBuilding(buildingId, {
        residentId,
        visitorId
      });
    },
    enabled: !!buildingId,
    refetchInterval: autoRefresh ? refreshInterval : false,
    staleTime: 30000
  });

  // Generate PIN mutation
  const generatePinMutation = useMutation({
    mutationFn: (request: PinGenerateRequest) => qboxPinService.generatePin(request),
    onSuccess: (newPin) => {
      queryClient.invalidateQueries({ queryKey: ['qbox-pins', buildingId] });
      toast.success(`PIN generated: ${newPin.pin}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate PIN: ${error.message}`);
    }
  });

  // Generate batch PINs mutation
  const generateBatchMutation = useMutation({
    mutationFn: ({ request, count }: { request: PinGenerateRequest; count: number }) =>
      qboxPinService.generateBatchPins(request, count),
    onSuccess: (pins) => {
      queryClient.invalidateQueries({ queryKey: ['qbox-pins', buildingId] });
      toast.success(`Generated ${pins.length} PINs successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate batch PINs: ${error.message}`);
    }
  });

  // Validate PIN mutation
  const validatePinMutation = useMutation({
    mutationFn: ({ pin, deviceId }: { pin: string; deviceId: string }) =>
      qboxPinService.validatePin(pin, deviceId),
    onSuccess: (result, variables) => {
      // Cache validation result
      validationCache.set(variables.pin, {
        result,
        timestamp: Date.now()
      });
      
      if (result.valid) {
        toast.success('PIN validated successfully');
      } else {
        toast.error(`Invalid PIN: ${result.reason || 'Unknown reason'}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`PIN validation error: ${error.message}`);
    }
  });

  // Revoke PIN mutation
  const revokePinMutation = useMutation({
    mutationFn: ({ pinId, reason }: { pinId: string; reason?: string }) =>
      qboxPinService.revokePin(pinId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qbox-pins'] });
      toast.success('PIN revoked successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to revoke PIN: ${error.message}`);
    }
  });

  // Update PIN mutation
  const updatePinMutation = useMutation({
    mutationFn: ({ pinId, updates }: { pinId: string; updates: Partial<PinGenerateRequest> }) =>
      qboxPinService.updatePin(pinId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qbox-pins'] });
      toast.success('PIN updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update PIN: ${error.message}`);
    }
  });

  // Clean expired PINs mutation
  const cleanExpiredMutation = useMutation({
    mutationFn: () => qboxPinService.cleanExpiredPins(),
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['qbox-pins'] });
      toast.success(`Cleaned ${count} expired PINs`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to clean expired PINs: ${error.message}`);
    }
  });

  // Get PIN usage logs
  const getPinLogs = useCallback(
    async (pinId: string, limit?: number) => {
      try {
        const logs = await qboxPinService.getPinUsageLogs(pinId, limit);
        return logs;
      } catch (error) {
        toast.error('Failed to fetch PIN logs');
        return [];
      }
    },
    []
  );

  // Quick validate (with cache)
  const quickValidate = useCallback(
    (pin: string): PinValidationResult | null => {
      const cached = validationCache.get(pin);
      if (cached && Date.now() - cached.timestamp < 5000) {
        return cached.result;
      }
      return null;
    },
    [validationCache]
  );

  // Generate temporary PIN helper
  const generateTemporaryPin = useCallback(
    async (hours: number = 24, description: string) => {
      if (!buildingId) {
        toast.error('Building ID is required');
        return null;
      }

      const request: PinGenerateRequest = {
        type: 'temporary',
        buildingId,
        description,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + hours * 60 * 60 * 1000)
      };

      try {
        const pin = await qboxPinService.generatePin(request);
        await refetch();
        return pin;
      } catch (error) {
        console.error('Failed to generate temporary PIN:', error);
        return null;
      }
    },
    [buildingId, refetch]
  );

  // Generate visitor PIN helper
  const generateVisitorPin = useCallback(
    async (visitorId: string, description: string, validHours: number = 4) => {
      if (!buildingId) {
        toast.error('Building ID is required');
        return null;
      }

      const request: PinGenerateRequest = {
        type: 'temporary',
        buildingId,
        visitorId,
        description,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + validHours * 60 * 60 * 1000),
        maxUsage: 5 // Allow 5 uses for visitors
      };

      try {
        const pin = await qboxPinService.generatePin(request);
        await refetch();
        return pin;
      } catch (error) {
        console.error('Failed to generate visitor PIN:', error);
        return null;
      }
    },
    [buildingId, refetch]
  );

  // Filter helpers
  const activePins = pins.filter(pin => pin.status === 'active' && qboxPinService.isValidForTime(pin));
  const expiredPins = pins.filter(pin => pin.status === 'expired' || !qboxPinService.isValidForTime(pin));
  const permanentPins = pins.filter(pin => pin.type === 'permanent');
  const temporaryPins = pins.filter(pin => pin.type === 'temporary');

  return {
    // Data
    pins,
    activePins,
    expiredPins,
    permanentPins,
    temporaryPins,
    isLoading,
    error,

    // Mutations
    generatePin: generatePinMutation.mutate,
    generateBatch: generateBatchMutation.mutate,
    validatePin: validatePinMutation.mutate,
    revokePin: revokePinMutation.mutate,
    updatePin: updatePinMutation.mutate,
    cleanExpired: cleanExpiredMutation.mutate,

    // Helpers
    getPinLogs,
    quickValidate,
    generateTemporaryPin,
    generateVisitorPin,
    refetch,

    // Loading states
    isGenerating: generatePinMutation.isPending,
    isGeneratingBatch: generateBatchMutation.isPending,
    isValidating: validatePinMutation.isPending,
    isRevoking: revokePinMutation.isPending,
    isUpdating: updatePinMutation.isPending,
    isCleaning: cleanExpiredMutation.isPending
  };
}