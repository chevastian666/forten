/**
 * Reports Hook
 * React hook for managing and generating reports
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  reportService,
  Report,
  ReportType,
  ReportFormat,
  DateRange,
  TimeRange
} from '@/services/analytics';
import { analyticsService } from '@/services/analytics';
import { toast } from 'sonner';
import { saveAs } from 'file-saver';

interface UseReportsOptions {
  autoRefresh?: boolean;
  onReportGenerated?: (report: Report) => void;
  onReportScheduled?: (report: Report) => void;
}

export function useReports(options: UseReportsOptions = {}) {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  const { autoRefresh = true, onReportGenerated, onReportScheduled } = options;

  // Fetch reports
  const {
    data: reports,
    isLoading: isLoadingReports,
    error: reportsError,
    refetch: refetchReports
  } = useQuery({
    queryKey: ['reports'],
    queryFn: () => reportService.getReports(),
    staleTime: 60000, // 1 minute
    refetchInterval: autoRefresh ? 300000 : false // 5 minutes
  });

  // Create report mutation
  const createReportMutation = useMutation({
    mutationFn: (report: Omit<Report, 'id' | 'createdAt' | 'updatedAt'>) =>
      reportService.createReport(report),
    onSuccess: (newReport) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Reporte creado exitosamente');
      if (newReport.schedule?.enabled && onReportScheduled) {
        onReportScheduled(newReport);
      }
    },
    onError: (error) => {
      toast.error('Error al crear el reporte');
      console.error('Create report error:', error);
    }
  });

  // Update report mutation
  const updateReportMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Report> }) =>
      reportService.updateReport(id, updates),
    onSuccess: (updatedReport) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Reporte actualizado');
      if (updatedReport?.schedule?.enabled && onReportScheduled) {
        onReportScheduled(updatedReport);
      }
    },
    onError: (error) => {
      toast.error('Error al actualizar el reporte');
      console.error('Update report error:', error);
    }
  });

  // Delete report mutation
  const deleteReportMutation = useMutation({
    mutationFn: (id: string) => reportService.deleteReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Reporte eliminado');
    },
    onError: (error) => {
      toast.error('Error al eliminar el reporte');
      console.error('Delete report error:', error);
    }
  });

  // Generate report
  const generateReport = useCallback(async (
    reportId: string,
    dateRange?: DateRange,
    timeRange?: TimeRange
  ) => {
    setIsGenerating(true);
    setGenerationProgress(0);
    
    try {
      // Get date range
      const effectiveDateRange = dateRange || (timeRange ? analyticsService.getDateRange(timeRange) : analyticsService.getDateRange('month'));
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      // Generate report
      const reportBlob = await reportService.generateReport(reportId, effectiveDateRange);
      
      clearInterval(progressInterval);
      setGenerationProgress(100);
      
      // Get report details
      const report = await reportService.getReport(reportId);
      if (!report) throw new Error('Report not found');
      
      // Determine filename
      const format = report.format[0] || 'pdf';
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${report.name.replace(/\s+/g, '_')}_${timestamp}.${format}`;
      
      // Download file
      saveAs(reportBlob, filename);
      
      toast.success('Reporte generado exitosamente');
      
      if (onReportGenerated) {
        onReportGenerated(report);
      }
    } catch (error) {
      toast.error('Error al generar el reporte');
      console.error('Generate report error:', error);
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  }, [onReportGenerated]);

  // Generate and email report
  const generateAndEmailReport = useCallback(async (
    reportId: string,
    recipients: string[],
    dateRange?: DateRange,
    timeRange?: TimeRange
  ) => {
    setIsGenerating(true);
    
    try {
      // Get date range
      const effectiveDateRange = dateRange || (timeRange ? analyticsService.getDateRange(timeRange) : analyticsService.getDateRange('month'));
      
      // Generate report
      const reportBlob = await reportService.generateReport(reportId, effectiveDateRange);
      
      // In real implementation, this would send the report via email
      // For now, just simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(`Reporte enviado a ${recipients.join(', ')}`);
    } catch (error) {
      toast.error('Error al enviar el reporte');
      console.error('Email report error:', error);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // Schedule report
  const scheduleReport = useCallback(async (
    reportId: string,
    schedule: Report['schedule']
  ) => {
    try {
      const updates = { schedule };
      await updateReportMutation.mutateAsync({ id: reportId, updates });
      
      if (schedule?.enabled) {
        toast.success('Reporte programado exitosamente');
      } else {
        toast.info('Programación del reporte desactivada');
      }
    } catch (error) {
      toast.error('Error al programar el reporte');
      console.error('Schedule report error:', error);
    }
  }, [updateReportMutation]);

  // Get report templates
  const getReportTemplates = useCallback((type?: ReportType) => {
    // In real implementation, this would fetch from a template library
    const templates = [
      {
        id: 'access-daily',
        name: 'Reporte Diario de Accesos',
        type: 'access' as ReportType,
        description: 'Resumen diario de accesos y visitantes'
      },
      {
        id: 'security-weekly',
        name: 'Reporte Semanal de Seguridad',
        type: 'security' as ReportType,
        description: 'Análisis semanal de alertas y eventos de seguridad'
      },
      {
        id: 'financial-monthly',
        name: 'Reporte Financiero Mensual',
        type: 'financial' as ReportType,
        description: 'Estado financiero mensual con ingresos y gastos'
      },
      {
        id: 'maintenance-monthly',
        name: 'Reporte Mensual de Mantenimiento',
        type: 'maintenance' as ReportType,
        description: 'Resumen de solicitudes y costos de mantenimiento'
      },
      {
        id: 'occupancy-quarterly',
        name: 'Reporte Trimestral de Ocupación',
        type: 'occupancy' as ReportType,
        description: 'Análisis trimestral de ocupación y demografía'
      }
    ];
    
    return type ? templates.filter(t => t.type === type) : templates;
  }, []);

  // Duplicate report
  const duplicateReport = useCallback(async (reportId: string) => {
    try {
      const report = await reportService.getReport(reportId);
      if (!report) throw new Error('Report not found');
      
      const { id, createdAt, updatedAt, ...reportData } = report;
      const newReport = {
        ...reportData,
        name: `${report.name} (Copia)`,
        schedule: report.schedule ? { ...report.schedule, enabled: false } : undefined
      };
      
      await createReportMutation.mutateAsync(newReport);
      toast.success('Reporte duplicado exitosamente');
    } catch (error) {
      toast.error('Error al duplicar el reporte');
      console.error('Duplicate report error:', error);
    }
  }, [createReportMutation]);

  // Preview report
  const previewReport = useCallback(async (
    reportId: string,
    dateRange?: DateRange,
    timeRange?: TimeRange
  ) => {
    try {
      const effectiveDateRange = dateRange || (timeRange ? analyticsService.getDateRange(timeRange) : analyticsService.getDateRange('month'));
      
      // In real implementation, this would generate a preview
      // For now, just show a toast
      toast.info('Vista previa del reporte generada');
      
      // Open in new window
      const previewUrl = `/reports/preview/${reportId}?start=${effectiveDateRange.start.toISOString()}&end=${effectiveDateRange.end.toISOString()}`;
      window.open(previewUrl, '_blank');
    } catch (error) {
      toast.error('Error al generar vista previa');
      console.error('Preview report error:', error);
    }
  }, []);

  return {
    // Data
    reports,
    
    // Loading states
    isLoading: isLoadingReports,
    isGenerating,
    generationProgress,
    isCreating: createReportMutation.isPending,
    isUpdating: updateReportMutation.isPending,
    isDeleting: deleteReportMutation.isPending,
    
    // Errors
    error: reportsError,
    
    // Methods
    createReport: createReportMutation.mutate,
    updateReport: updateReportMutation.mutate,
    deleteReport: deleteReportMutation.mutate,
    generateReport,
    generateAndEmailReport,
    scheduleReport,
    getReportTemplates,
    duplicateReport,
    previewReport,
    refetchReports
  };
}