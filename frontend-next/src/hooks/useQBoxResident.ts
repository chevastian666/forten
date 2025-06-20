/**
 * Q-Box Resident Hook
 * React hook for managing Q-Box resident synchronization
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { qboxResidentService, QBoxResident, SyncResult, SyncProgress } from '@/services/qbox';
import { toast } from 'sonner';

interface UseQBoxResidentOptions {
  buildingId?: string;
  autoSync?: boolean;
  onSyncProgress?: (progress: SyncProgress) => void;
}

export function useQBoxResident(options: UseQBoxResidentOptions = {}) {
  const queryClient = useQueryClient();
  const { buildingId, autoSync = false, onSyncProgress } = options;
  
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Subscribe to sync progress
  useEffect(() => {
    const unsubscribe = qboxResidentService.onSyncProgress((progress) => {
      setSyncProgress(progress);
      onSyncProgress?.(progress);
    });

    return unsubscribe;
  }, [onSyncProgress]);

  // Get residents
  const { data: residents = [], isLoading, error, refetch } = useQuery({
    queryKey: ['qbox-residents', buildingId],
    queryFn: () => {
      if (!buildingId) return [];
      return qboxResidentService.getResidents(buildingId);
    },
    enabled: !!buildingId,
    staleTime: 60000 // 1 minute
  });

  // Get sync status
  const { data: syncStatus } = useQuery({
    queryKey: ['qbox-sync-status', buildingId],
    queryFn: () => {
      if (!buildingId) return null;
      return qboxResidentService.getSyncStatus(buildingId);
    },
    enabled: !!buildingId,
    refetchInterval: isSyncing ? 5000 : false // Refresh every 5s during sync
  });

  // Sync building mutation
  const syncBuildingMutation = useMutation({
    mutationFn: (buildingId: string) => {
      setIsSyncing(true);
      return qboxResidentService.syncBuilding(buildingId);
    },
    onSuccess: (result: SyncResult) => {
      setIsSyncing(false);
      setSyncProgress(null);
      queryClient.invalidateQueries({ queryKey: ['qbox-residents', buildingId] });
      queryClient.invalidateQueries({ queryKey: ['qbox-sync-status', buildingId] });
      
      if (result.success) {
        toast.success(`Sync completed: ${result.synced} synced, ${result.failed} failed`);
      } else {
        toast.error('Sync failed');
      }
    },
    onError: (error: Error) => {
      setIsSyncing(false);
      setSyncProgress(null);
      toast.error(`Sync error: ${error.message}`);
    }
  });

  // Update resident mutation
  const updateResidentMutation = useMutation({
    mutationFn: ({ residentId, updates }: { residentId: string; updates: Partial<QBoxResident> }) =>
      qboxResidentService.updateResident(residentId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qbox-residents', buildingId] });
      toast.success('Resident updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update resident: ${error.message}`);
    }
  });

  // Remove resident mutation
  const removeResidentMutation = useMutation({
    mutationFn: (residentId: string) => qboxResidentService.removeResident(residentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qbox-residents', buildingId] });
      queryClient.invalidateQueries({ queryKey: ['qbox-sync-status', buildingId] });
      toast.success('Resident removed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove resident: ${error.message}`);
    }
  });

  // Batch update mutation
  const batchUpdateMutation = useMutation({
    mutationFn: ({ buildingId, updates }: { 
      buildingId: string; 
      updates: Array<{ residentId: string; updates: Partial<QBoxResident> }>
    }) => qboxResidentService.batchUpdateResidents(buildingId, updates),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['qbox-residents', buildingId] });
      queryClient.invalidateQueries({ queryKey: ['qbox-sync-status', buildingId] });
      toast.success(`Batch update completed: ${result.synced} updated, ${result.failed} failed`);
    },
    onError: (error: Error) => {
      toast.error(`Batch update error: ${error.message}`);
    }
  });

  // Sync single resident helper
  const syncResident = useCallback(
    async (resident: QBoxResident, deviceIds: string[]) => {
      try {
        await qboxResidentService.syncResident(resident, deviceIds);
        await refetch();
        toast.success(`Resident ${resident.firstName} ${resident.lastName} synced`);
      } catch (error: any) {
        toast.error(`Failed to sync resident: ${error.message}`);
      }
    },
    [refetch]
  );

  // Auto-sync effect
  useEffect(() => {
    if (autoSync && buildingId && !isSyncing) {
      const needsSync = residents.some(r => r.syncStatus !== 'synced');
      if (needsSync) {
        syncBuildingMutation.mutate(buildingId);
      }
    }
  }, [autoSync, buildingId, residents, isSyncing, syncBuildingMutation]);

  // Filter helpers
  const syncedResidents = residents.filter(r => r.syncStatus === 'synced');
  const pendingResidents = residents.filter(r => r.syncStatus === 'pending');
  const errorResidents = residents.filter(r => r.syncStatus === 'error');
  const activeResidents = residents.filter(r => r.status === 'active');

  // Calculate sync percentage
  const syncPercentage = residents.length > 0
    ? Math.round((syncedResidents.length / residents.length) * 100)
    : 0;

  return {
    // Data
    residents,
    syncedResidents,
    pendingResidents,
    errorResidents,
    activeResidents,
    syncStatus,
    syncProgress,
    syncPercentage,
    isLoading,
    error,

    // State
    isSyncing: isSyncing || qboxResidentService.isSyncing(),

    // Mutations
    syncBuilding: syncBuildingMutation.mutate,
    updateResident: updateResidentMutation.mutate,
    removeResident: removeResidentMutation.mutate,
    batchUpdate: batchUpdateMutation.mutate,

    // Helpers
    syncResident,
    refetch,

    // Loading states
    isSyncingBuilding: syncBuildingMutation.isPending,
    isUpdating: updateResidentMutation.isPending,
    isRemoving: removeResidentMutation.isPending,
    isBatchUpdating: batchUpdateMutation.isPending
  };
}