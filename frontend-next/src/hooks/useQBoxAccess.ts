/**
 * Q-Box Access Hook
 * React hook for managing Q-Box access control
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { qboxAccessService, AccessPermission, AccessLog, AccessStats } from '@/services/qbox';
import { toast } from 'sonner';

interface UseQBoxAccessOptions {
  buildingId?: string;
  userId?: string;
  deviceId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useQBoxAccess(options: UseQBoxAccessOptions = {}) {
  const queryClient = useQueryClient();
  const { buildingId, userId, deviceId, autoRefresh = true, refreshInterval = 30000 } = options;

  // Get access permissions
  const { data: permissions = [], isLoading: permissionsLoading, error: permissionsError } = useQuery({
    queryKey: ['qbox-permissions', buildingId, userId, deviceId],
    queryFn: () => {
      if (!buildingId) return [];
      return qboxAccessService.getAccessPermissions(buildingId, {
        userId,
        deviceId
      });
    },
    enabled: !!buildingId,
    refetchInterval: autoRefresh ? refreshInterval : false,
    staleTime: 15000
  });

  // Get access logs
  const { data: logs = [], isLoading: logsLoading, error: logsError, refetch: refetchLogs } = useQuery({
    queryKey: ['qbox-access-logs', buildingId, deviceId, userId],
    queryFn: () => {
      if (!buildingId) return [];
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // Last 7 days
      
      return qboxAccessService.getAccessLogs(buildingId, {
        deviceId,
        userId,
        startDate,
        endDate,
        limit: 100
      });
    },
    enabled: !!buildingId,
    refetchInterval: autoRefresh ? refreshInterval : false
  });

  // Get access statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['qbox-access-stats', buildingId],
    queryFn: () => {
      if (!buildingId) return null;
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // Last 30 days
      
      return qboxAccessService.getAccessStats(buildingId, { startDate, endDate });
    },
    enabled: !!buildingId,
    staleTime: 300000 // 5 minutes
  });

  // Grant access mutation
  const grantAccessMutation = useMutation({
    mutationFn: (permission: Omit<AccessPermission, 'id' | 'createdAt' | 'updatedAt'>) =>
      qboxAccessService.grantAccess(permission),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qbox-permissions'] });
      toast.success('Access permission granted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to grant access: ${error.message}`);
    }
  });

  // Revoke access mutation
  const revokeAccessMutation = useMutation({
    mutationFn: ({ permissionId, reason }: { permissionId: string; reason?: string }) =>
      qboxAccessService.revokeAccess(permissionId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qbox-permissions'] });
      toast.success('Access permission revoked');
    },
    onError: (error: Error) => {
      toast.error(`Failed to revoke access: ${error.message}`);
    }
  });

  // Update access mutation
  const updateAccessMutation = useMutation({
    mutationFn: ({ permissionId, updates }: { permissionId: string; updates: Partial<AccessPermission> }) =>
      qboxAccessService.updateAccess(permissionId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qbox-permissions'] });
      toast.success('Access permission updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update access: ${error.message}`);
    }
  });

  // Request remote access mutation
  const remoteAccessMutation = useMutation({
    mutationFn: (request: Parameters<typeof qboxAccessService.requestRemoteAccess>[0]) =>
      qboxAccessService.requestRemoteAccess(request),
    onSuccess: (granted) => {
      if (granted) {
        toast.success('Remote access granted');
        queryClient.invalidateQueries({ queryKey: ['qbox-access-logs'] });
      } else {
        toast.error('Remote access denied');
      }
    },
    onError: (error: Error) => {
      toast.error(`Remote access error: ${error.message}`);
    }
  });

  // Emergency access mutation
  const emergencyAccessMutation = useMutation({
    mutationFn: ({ buildingId, reason }: { buildingId: string; reason: string }) =>
      qboxAccessService.emergencyAccess(buildingId, reason),
    onSuccess: () => {
      toast.success('Emergency access activated');
      queryClient.invalidateQueries({ queryKey: ['qbox-access-logs'] });
    },
    onError: (error: Error) => {
      toast.error(`Emergency access failed: ${error.message}`);
    }
  });

  // Check access helper
  const checkAccess = useCallback(
    async (userId: string, deviceId: string, method: AccessLog['method']) => {
      try {
        const hasAccess = await qboxAccessService.checkAccess(userId, deviceId, method);
        return hasAccess;
      } catch (error) {
        console.error('Access check failed:', error);
        return false;
      }
    },
    []
  );

  // Grant temporary access helper
  const grantTemporaryAccess = useCallback(
    async (userId: string, devices: string[], hours: number = 4) => {
      if (!buildingId) {
        toast.error('Building ID is required');
        return null;
      }

      const permission: Omit<AccessPermission, 'id' | 'createdAt' | 'updatedAt'> = {
        userId,
        userType: 'visitor',
        buildingId,
        devices,
        accessType: 'visitor',
        validFrom: new Date(),
        validUntil: new Date(Date.now() + hours * 60 * 60 * 1000),
        methods: ['pin', 'qr'],
        status: 'active',
        createdBy: 'system'
      };

      try {
        const granted = await qboxAccessService.grantAccess(permission);
        return granted;
      } catch (error) {
        console.error('Failed to grant temporary access:', error);
        return null;
      }
    },
    [buildingId]
  );

  // Filter helpers
  const activePermissions = permissions.filter(p => p.status === 'active');
  const suspendedPermissions = permissions.filter(p => p.status === 'suspended');
  const expiredPermissions = permissions.filter(p => p.status === 'expired');
  
  const grantedLogs = logs.filter(log => log.granted);
  const deniedLogs = logs.filter(log => !log.granted);
  const recentLogs = logs.slice(0, 10);

  // Calculate access rate
  const accessRate = logs.length > 0 
    ? Math.round((grantedLogs.length / logs.length) * 100) 
    : 0;

  return {
    // Data
    permissions,
    activePermissions,
    suspendedPermissions,
    expiredPermissions,
    logs,
    grantedLogs,
    deniedLogs,
    recentLogs,
    stats,
    accessRate,
    isLoading: permissionsLoading || logsLoading || statsLoading,
    error: permissionsError || logsError,

    // Mutations
    grantAccess: grantAccessMutation.mutate,
    revokeAccess: revokeAccessMutation.mutate,
    updateAccess: updateAccessMutation.mutate,
    requestRemoteAccess: remoteAccessMutation.mutate,
    emergencyAccess: emergencyAccessMutation.mutate,

    // Helpers
    checkAccess,
    grantTemporaryAccess,
    refetchLogs,

    // Loading states
    isGranting: grantAccessMutation.isPending,
    isRevoking: revokeAccessMutation.isPending,
    isUpdating: updateAccessMutation.isPending,
    isRequestingRemote: remoteAccessMutation.isPending,
    isEmergency: emergencyAccessMutation.isPending
  };
}